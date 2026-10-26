// 浏览器端结果页加载：失败重试、内存缓存和预取

import { GetBangumiCalendarData } from './bangumi.client';
import {
  fetchDoubanCategories,
  fetchDoubanList,
  fetchDoubanRecommends,
  getDoubanCategories,
  getDoubanList,
  getDoubanProxyConfig,
  getDoubanRecommends,
} from './douban.client';
import {
  CustomCategory,
  getListingKey,
  getTotalPages,
  isBangumiSchedule,
  ListingQuery,
  RESULT_PAGE_SIZE,
} from './listing';
import { DoubanItem, DoubanResult } from './types';

export interface ResultPage {
  items: DoubanItem[];
  totalPages: number;
}

// 豆瓣的失败大多是短暂限流：1 秒后和 3 秒后各重试一次
export const RETRY_DELAYS = [1000, 3000];

// direct 模式：服务器失败后立即由浏览器改走豆瓣 CDN 镜像，镜像也失败则 1 秒后再试一次服务器。
// 原因：豆瓣会对 Vercel 的出口限流数分钟，期间服务器请求全部超时，浏览器自己的网络不受影响
export const MIRROR_RETRY_DELAYS = [0, 1000];

const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;

interface CacheEntry {
  promise: Promise<ResultPage>;
  value?: ResultPage;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  load: (attempt: number) => Promise<T>,
  delays = RETRY_DELAYS
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load(attempt);
    } catch (err) {
      if (attempt >= delays.length) throw err;
      await sleep(delays[attempt]);
    }
  }
}

function checkResult(data: DoubanResult): DoubanResult {
  if (data?.code !== 200) {
    throw new Error(data?.message || '获取数据失败');
  }
  return data;
}

async function fetchResultPage(
  query: ListingQuery,
  customCategories: CustomCategory[]
): Promise<ResultPage> {
  const { channel, primary, secondary, filters, page } = query;
  const pageStart = (page - 1) * RESULT_PAGE_SIZE;
  let load: () => Promise<DoubanResult>;
  // 同一请求经豆瓣 CDN 镜像（腾讯云）由浏览器直接获取
  let mirror: () => Promise<DoubanResult>;

  if (channel === 'custom') {
    const category = customCategories.find(
      (cat) => cat.type === primary && cat.query === secondary
    );
    if (!category) return { items: [], totalPages: 1 };
    const params = {
      tag: category.query,
      type: category.type,
      pageLimit: RESULT_PAGE_SIZE,
      pageStart,
    };
    load = () => getDoubanList(params);
    mirror = () => fetchDoubanList(params, '', true, false);
  } else if (isBangumiSchedule(query)) {
    const calendar = await withRetry(() => GetBangumiCalendarData());
    const weekdayData = calendar.find(
      (item) => item.weekday.en === query.weekday
    );
    const items = (weekdayData?.items || []).map((item) => ({
      id: item.id?.toString() || '',
      title: item.name_cn || item.name,
      poster:
        // large 是原图（可达数 MB），卡片宽度下 common 已足够清晰
        item.images?.common ||
        item.images?.large ||
        item.images?.medium ||
        item.images?.small ||
        item.images?.grid ||
        '',
      rate: item.rating?.score?.toString() || '',
      year: item.air_date?.split('-')?.[0] || '',
    }));
    return { items, totalPages: 1 };
  } else if (channel === 'anime' || primary === '全部') {
    const params =
      channel === 'anime'
        ? {
            kind: (primary === '番剧' ? 'tv' : 'movie') as 'tv' | 'movie',
            pageLimit: RESULT_PAGE_SIZE,
            pageStart,
            category: '动画',
            format: primary === '番剧' ? '电视剧' : '',
            region: filters.region || '',
            year: filters.year || '',
            platform: filters.platform || '',
            sort: filters.sort || '',
            label: filters.label || '',
          }
        : {
            kind: channel === 'show' ? 'tv' : (channel as 'tv' | 'movie'),
            pageLimit: RESULT_PAGE_SIZE,
            pageStart,
            category: filters.type || '',
            format:
              channel === 'show'
                ? '综艺'
                : channel === 'tv'
                ? '电视剧'
                : '电影',
            region: filters.region || '',
            year: filters.year || '',
            platform: filters.platform || '',
            sort: filters.sort || '',
            label: filters.label || '',
          };
    load = () => getDoubanRecommends(params);
    mirror = () => fetchDoubanRecommends(params, '', true, false);
  } else {
    // 剧集和综艺的 kind 统一为 tv，category 使用频道本身
    const isTv = channel === 'tv' || channel === 'show';
    const params = {
      kind: (isTv ? 'tv' : 'movie') as 'tv' | 'movie',
      category: isTv ? channel : primary,
      type: secondary,
      pageLimit: RESULT_PAGE_SIZE,
      pageStart,
    };
    load = () => getDoubanCategories(params);
    mirror = () => fetchDoubanCategories(params, '', true, false);
  }

  const useMirror = getDoubanProxyConfig().proxyType === 'direct';
  const data = await withRetry(
    async (attempt) =>
      checkResult(await (useMirror && attempt === 1 ? mirror() : load())),
    useMirror ? MIRROR_RETRY_DELAYS : RETRY_DELAYS
  );
  return {
    items: data.list,
    totalPages: getTotalPages(data.total, page, data.list.length),
  };
}

// 已加载完成且未过期的结果页，可同步读取，避免闪现骨架屏
export function peekResultPage(query: ListingQuery): ResultPage | undefined {
  const entry = cache.get(getListingKey(query));
  return entry && entry.expires > Date.now() ? entry.value : undefined;
}

// 同一结果页的并发请求（点击与预取）共享同一个 Promise；失败的结果不缓存
export function loadResultPage(
  query: ListingQuery,
  customCategories: CustomCategory[]
): Promise<ResultPage> {
  const key = getListingKey(query);
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) {
    return existing.promise;
  }

  const entry: CacheEntry = {
    promise: fetchResultPage(query, customCategories),
    expires: Date.now() + CACHE_TTL,
  };
  entry.promise.then(
    (value) => {
      entry.value = value;
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    }
  );

  cache.delete(key);
  cache.set(key, entry);
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return entry.promise;
}

export function prefetchResultPage(
  query: ListingQuery,
  customCategories: CustomCategory[]
): void {
  loadResultPage(query, customCategories).catch(() => undefined);
}

export function clearResultPageCache(): void {
  cache.clear();
}
