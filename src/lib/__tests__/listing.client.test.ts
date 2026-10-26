import { GetBangumiCalendarData } from '@/lib/bangumi.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { parseListingQuery } from '@/lib/listing';
import {
  clearResultPageCache,
  loadResultPage,
  peekResultPage,
  RETRY_DELAYS,
} from '@/lib/listing.client';

jest.mock('@/lib/douban.client', () => ({
  getDoubanCategories: jest.fn(),
  getDoubanList: jest.fn(),
  getDoubanRecommends: jest.fn(),
}));
jest.mock('@/lib/bangumi.client', () => ({
  GetBangumiCalendarData: jest.fn(),
}));

const mockCategories = getDoubanCategories as jest.MockedFunction<
  typeof getDoubanCategories
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
      kind: 'movie',
      category: '热门',
      type: '全部',
      pageLimit: 30,
      pageStart: 60,
    });
    expect(page).toEqual({ items: [item], totalPages: 3 });
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

  it('retries twice and then succeeds', async () => {
    mockCategories
      .mockResolvedValueOnce(failure)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(success);

    const promise = loadResultPage(query('type=movie&page=2'), []);
    await flushRetries();

    await expect(promise).resolves.toEqual({ items: [item], totalPages: 3 });
    expect(mockCategories).toHaveBeenCalledTimes(3);
  });

  it('fails after the retries and does not cache the failure', async () => {
    mockCategories.mockResolvedValue(failure);

    const promise = loadResultPage(query('type=movie&page=2'), []);
    const assertion = expect(promise).rejects.toThrow('rate limited');
    await flushRetries();
    await assertion;
    expect(mockCategories).toHaveBeenCalledTimes(3);

    mockCategories.mockResolvedValue(success);
    await expect(
      loadResultPage(query('type=movie&page=2'), [])
    ).resolves.toEqual({ items: [item], totalPages: 3 });
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
    });
  });

  it('returns an empty Result page for an unknown custom category', async () => {
    await expect(
      loadResultPage(query('type=custom&primary=movie&secondary=x'), [])
    ).resolves.toEqual({ items: [], totalPages: 1 });
  });
});
