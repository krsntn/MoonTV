import { GetBangumiCalendarData } from '@/lib/bangumi.client';
import {
  fetchDoubanRecommends,
  getDoubanProxyConfig,
  getDoubanRecommends,
} from '@/lib/douban.client';
import { parseListingQuery } from '@/lib/listing';
import {
  clearResultPageCache,
  loadResultPage,
  peekResultPage,
  RETRY_DELAYS,
} from '@/lib/listing.client';

jest.mock('@/lib/douban.client', () => ({
  fetchDoubanList: jest.fn(),
  fetchDoubanRecommends: jest.fn(),
  getDoubanList: jest.fn(),
  getDoubanProxyConfig: jest.fn(),
  getDoubanRecommends: jest.fn(),
}));
jest.mock('@/lib/bangumi.client', () => ({
  GetBangumiCalendarData: jest.fn(),
}));

const mockCategories = getDoubanRecommends as jest.MockedFunction<
  typeof getDoubanRecommends
>;
const mockMirror = fetchDoubanRecommends as jest.MockedFunction<
  typeof fetchDoubanRecommends
>;

// 电影 Listing 第 2 页（默认排序）的 recommend 请求参数
const moviePage2 = {
  kind: 'movie',
  pageLimit: 30,
  pageStart: 30,
  category: 'all',
  format: '电影',
  label: 'all',
  region: 'all',
  year: 'all',
  platform: 'all',
  sort: 'U',
};
const mockProxyConfig = getDoubanProxyConfig as jest.MockedFunction<
  typeof getDoubanProxyConfig
>;

const item = { id: '1', title: 'A', poster: '', rate: '8.0', year: '2024' };
const success = { code: 200, message: 'ok', list: [item], total: 61 };
const failure = { code: 500, message: 'rate limited', list: [] };

function query(search: string) {
  return parseListingQuery(new URLSearchParams(search), 'Mon');
}

async function flushPromises() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

// 推进所有重试等待
async function flushRetries() {
  for (const delay of RETRY_DELAYS) {
    await flushPromises();
    jest.advanceTimersByTime(delay);
  }
  await flushPromises();
}

beforeEach(() => {
  jest.useFakeTimers();
  mockCategories.mockReset();
  mockMirror.mockReset();
  mockProxyConfig.mockReturnValue({ proxyType: 'direct', proxyUrl: '' });
  clearResultPageCache();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('loadResultPage', () => {
  it('requests 30 items from the right offset and computes the total pages', async () => {
    mockCategories.mockResolvedValue(success);

    const page = await loadResultPage(query('type=movie&page=3'), []);

    expect(mockCategories).toHaveBeenCalledWith({
      ...moviePage2,
      pageStart: 60,
    });
    expect(page).toEqual({ items: [item], totalPages: 3, total: 61 });
  });

  it('passes the filters and the sort to the recommend API', async () => {
    mockCategories.mockResolvedValue(success);

    await loadResultPage(
      query('type=tv&genre=悬疑&region=韩国&platform=Netflix&sort=S'),
      []
    );

    expect(mockCategories).toHaveBeenCalledWith({
      kind: 'tv',
      pageLimit: 30,
      pageStart: 0,
      category: '悬疑',
      format: '电视剧',
      label: 'all',
      region: '韩国',
      year: 'all',
      platform: 'Netflix',
      sort: 'S',
    });
  });

  it('hides unrated titles when sorting by newest', async () => {
    mockCategories.mockResolvedValue(success);

    await loadResultPage(query('type=movie&sort=R'), []);

    expect(mockCategories).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'R', scoreRange: '7,10' })
    );
  });

  it('uses the anime form for kind and format', async () => {
    mockCategories.mockResolvedValue(success);

    await loadResultPage(query('type=anime&form=剧场版&label=治愈'), []);

    expect(mockCategories).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'movie',
        category: '动画',
        format: '',
        label: '治愈',
        platform: 'all',
      })
    );
  });

  it('shares one request between a prefetch and a click on the same Result page', async () => {
    mockCategories.mockResolvedValue(success);

    const first = loadResultPage(query('type=movie&page=2'), []);
    const second = loadResultPage(query('type=movie&page=2'), []);

    expect(second).toBe(first);
    await first;
    expect(mockCategories).toHaveBeenCalledTimes(1);
    expect(peekResultPage(query('type=movie&page=2'))).toBeDefined();
  });

  it('falls back to the Douban CDN mirror when the server fails', async () => {
    mockCategories.mockResolvedValue(failure);
    mockMirror.mockResolvedValue(success);

    const promise = loadResultPage(query('type=movie&page=2'), []);
    await flushRetries();

    await expect(promise).resolves.toEqual({
      items: [item],
      totalPages: 3,
      total: 61,
    });
    expect(mockCategories).toHaveBeenCalledTimes(1);
    expect(mockMirror).toHaveBeenCalledWith(moviePage2, '', true, false);
  });

  it('tries the server again when the mirror also fails', async () => {
    mockCategories.mockResolvedValueOnce(failure).mockResolvedValue(success);
    mockMirror.mockRejectedValue(new Error('network'));

    const promise = loadResultPage(query('type=movie&page=2'), []);
    await flushRetries();

    await expect(promise).resolves.toEqual({
      items: [item],
      totalPages: 3,
      total: 61,
    });
    expect(mockCategories).toHaveBeenCalledTimes(2);
    expect(mockMirror).toHaveBeenCalledTimes(1);
  });

  it('fails after all attempts and does not cache the failure', async () => {
    mockCategories.mockResolvedValue(failure);
    mockMirror.mockRejectedValue(new Error('network'));

    const promise = loadResultPage(query('type=movie&page=2'), []);
    const assertion = expect(promise).rejects.toThrow('rate limited');
    await flushRetries();
    await assertion;
    expect(mockCategories).toHaveBeenCalledTimes(2);
    expect(mockMirror).toHaveBeenCalledTimes(1);

    mockCategories.mockResolvedValue(success);
    await expect(
      loadResultPage(query('type=movie&page=2'), [])
    ).resolves.toEqual({ items: [item], totalPages: 3, total: 61 });
  });

  it('only retries the configured source when a proxy is set', async () => {
    mockProxyConfig.mockReturnValue({ proxyType: 'custom', proxyUrl: 'x' });
    mockCategories
      .mockResolvedValueOnce(failure)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(success);

    const promise = loadResultPage(query('type=movie&page=2'), []);
    await flushRetries();

    await expect(promise).resolves.toEqual({
      items: [item],
      totalPages: 3,
      total: 61,
    });
    expect(mockCategories).toHaveBeenCalledTimes(3);
    expect(mockMirror).not.toHaveBeenCalled();
  });

  it('keeps Bangumi items that have no images', async () => {
    (GetBangumiCalendarData as jest.Mock).mockResolvedValue([
      {
        weekday: { en: 'Mon' },
        items: [
          {
            id: 7,
            name: 'Name',
            name_cn: '',
            rating: null,
            air_date: '2026-10-01',
            images: null,
          },
        ],
      },
    ]);

    await expect(loadResultPage(query('type=anime'), [])).resolves.toEqual({
      items: [{ id: '7', title: 'Name', poster: '', rate: '', year: '2026' }],
      totalPages: 1,
      total: null,
    });
  });

  it('returns an empty Result page for an unknown custom category', async () => {
    await expect(
      loadResultPage(query('type=custom&form=movie&category=x'), [])
    ).resolves.toEqual({ items: [], totalPages: 1, total: null });
  });
});
