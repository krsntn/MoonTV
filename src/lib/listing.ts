// Listing 的查询参数：URL 是唯一的状态来源，刷新、前进后退和分享链接都显示相同的结果页

export const RESULT_PAGE_SIZE = 30;

export type Channel = 'movie' | 'tv' | 'show' | 'anime' | 'custom';

const CHANNELS: Channel[] = ['movie', 'tv', 'show', 'anime', 'custom'];

export interface CustomCategory {
  name: string;
  type: 'movie' | 'tv';
  query: string;
}

export interface ListingQuery {
  channel: Channel;
  primary: string;
  secondary: string;
  // MultiLevelSelector 的筛选值（排序传 value，其他传 label）
  filters: Record<string, string>;
  weekday: string;
  page: number;
}

export const DEFAULT_FILTERS: Record<string, string> = {
  type: 'all',
  region: 'all',
  year: 'all',
  platform: 'all',
  label: 'all',
  sort: 'T',
};

// 筛选 key 与 URL 参数名的对应关系（筛选的 type 与频道参数 type 冲突，改用 genre）
const FILTER_PARAMS: Record<string, string> = {
  type: 'genre',
  region: 'region',
  year: 'year',
  platform: 'platform',
  label: 'label',
  sort: 'sort',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getTodayWeekday(date = new Date()): string {
  return WEEKDAYS[date.getDay()];
}

export function getChannelDefaults(channel: Channel): {
  primary: string;
  secondary: string;
} {
  switch (channel) {
    case 'movie':
      return { primary: '热门', secondary: '全部' };
    case 'tv':
      return { primary: '最近热门', secondary: 'tv' };
    case 'show':
      return { primary: '最近热门', secondary: 'show' };
    case 'anime':
      return { primary: '每日放送', secondary: '全部' };
    default:
      // 自定义频道的默认值取决于自定义分类，见 getCustomDefaults
      return { primary: '', secondary: '' };
  }
}

// 自定义频道：优先选择 movie，没有 movie 则选择 tv，二级选择为该类型的第一个分类
export function getCustomDefaults(
  categories: CustomCategory[]
): { primary: string; secondary: string } | null {
  const primary = categories.some((cat) => cat.type === 'movie')
    ? 'movie'
    : 'tv';
  const first = categories.find((cat) => cat.type === primary);
  return first ? { primary, secondary: first.query } : null;
}

// 每日放送来自 Bangumi，只有一页
export function isBangumiSchedule(query: ListingQuery): boolean {
  return query.channel === 'anime' && query.primary === '每日放送';
}

export function toChannel(value: string | null): Channel {
  return CHANNELS.includes(value as Channel) ? (value as Channel) : 'movie';
}

export function parseListingQuery(
  params: URLSearchParams,
  today = getTodayWeekday()
): ListingQuery {
  const channel = toChannel(params.get('type'));
  const defaults = getChannelDefaults(channel);

  const filters = { ...DEFAULT_FILTERS };
  Object.entries(FILTER_PARAMS).forEach(([key, param]) => {
    const value = params.get(param);
    if (value) filters[key] = value;
  });

  const page = Math.floor(Number(params.get('page')));

  return {
    channel,
    primary: params.get('primary') || defaults.primary,
    secondary: params.get('secondary') || defaults.secondary,
    filters,
    weekday: params.get('weekday') || today,
    page: page > 1 ? page : 1,
  };
}

// 只写入非默认值，保持 URL 简短
export function buildListingSearch(
  query: ListingQuery,
  today = getTodayWeekday()
): string {
  const params = new URLSearchParams();
  const defaults = getChannelDefaults(query.channel);

  params.set('type', query.channel);
  if (query.primary && query.primary !== defaults.primary) {
    params.set('primary', query.primary);
  }
  if (query.secondary && query.secondary !== defaults.secondary) {
    params.set('secondary', query.secondary);
  }
  Object.entries(FILTER_PARAMS).forEach(([key, param]) => {
    const value = query.filters[key];
    if (value && value !== DEFAULT_FILTERS[key]) params.set(param, value);
  });
  if (isBangumiSchedule(query) && query.weekday !== today) {
    params.set('weekday', query.weekday);
  }
  if (query.page > 1) params.set('page', String(query.page));

  return params.toString();
}

export function getListingKey(query: ListingQuery): string {
  return JSON.stringify([
    query.channel,
    query.primary,
    query.secondary,
    Object.keys(DEFAULT_FILTERS).map((key) => query.filters[key]),
    isBangumiSchedule(query) ? query.weekday : '',
    query.page,
  ]);
}

export function areFiltersEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  return Object.keys(DEFAULT_FILTERS).every(
    (key) =>
      (a[key] ?? DEFAULT_FILTERS[key]) === (b[key] ?? DEFAULT_FILTERS[key])
  );
}

// 豆瓣返回 total 时按 total 计算；没有 total 时，满页说明可能还有下一页
export function getTotalPages(
  total: number | undefined,
  page: number,
  itemCount: number
): number {
  if (typeof total === 'number' && total >= 0) {
    return Math.max(1, Math.ceil(total / RESULT_PAGE_SIZE));
  }
  return itemCount < RESULT_PAGE_SIZE ? page : page + 1;
}
