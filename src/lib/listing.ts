// Listing 的查询参数：URL 是唯一的状态来源，刷新、前进后退和分享链接都显示相同的结果页

export const RESULT_PAGE_SIZE = 30;

export type Channel = 'movie' | 'tv' | 'show' | 'anime' | 'custom';

const CHANNELS: Channel[] = ['movie', 'tv', 'show', 'anime', 'custom'];

export interface CustomCategory {
  name: string;
  type: 'movie' | 'tv';
  query: string;
}

// 豆瓣 recommend 接口的排序：近期热度、综合、最新（首播时间）、高分
export type SortKey = 'U' | 'T' | 'R' | 'S';

const SORT_KEYS: SortKey[] = ['U', 'T', 'R', 'S'];

export const DEFAULT_SORT: SortKey = 'U';

// 动漫的形式：番剧和剧场版来自豆瓣，每日放送来自 Bangumi
const ANIME_FORMS = ['番剧', '剧场版', '每日放送'];

export interface ListingQuery {
  channel: Channel;
  // 动漫：番剧 / 剧场版 / 每日放送；自定义：movie / tv；其他频道为空
  form: string;
  // 自定义频道的分类（豆瓣标签）
  category: string;
  // 筛选值使用豆瓣标签（中文），'all' 表示不筛选
  filters: Record<string, string>;
  sort: SortKey;
  weekday: string;
  page: number;
}

export const DEFAULT_FILTERS: Record<string, string> = {
  type: 'all',
  label: 'all',
  region: 'all',
  year: 'all',
  platform: 'all',
};

// 筛选 key 与 URL 参数名的对应关系（筛选的 type 与频道参数 type 冲突，改用 genre）
const FILTER_PARAMS: Record<string, string> = {
  type: 'genre',
  label: 'label',
  region: 'region',
  year: 'year',
  platform: 'platform',
};

// 旧版 URL 的 primary（豆瓣精选榜单）对应的排序
const LEGACY_SORTS: Record<string, SortKey> = {
  热门: 'U',
  最近热门: 'U',
  最新: 'R',
  豆瓣高分: 'S',
};

// 旧版 URL 的 secondary（地区或剧集分类）对应的地区筛选
const LEGACY_REGIONS: Record<string, string> = {
  华语: '华语',
  欧美: '欧美',
  韩国: '韩国',
  日本: '日本',
  tv_domestic: '中国大陆',
  tv_american: '欧美',
  tv_korean: '韩国',
  tv_japanese: '日本',
  show_domestic: '中国大陆',
  show_foreign: '国外',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getTodayWeekday(date = new Date()): string {
  return WEEKDAYS[date.getDay()];
}

export function toChannel(value: string | null): Channel {
  return CHANNELS.includes(value as Channel) ? (value as Channel) : 'movie';
}

// 动漫默认显示每日放送；自定义频道的默认值取决于自定义分类，见 getCustomDefaults
export function getDefaultForm(channel: Channel): string {
  return channel === 'anime' ? '每日放送' : '';
}

// 自定义频道：优先选择 movie，没有 movie 则选择 tv，分类为该类型的第一个
export function getCustomDefaults(
  categories: CustomCategory[]
): { form: string; category: string } | null {
  const form = categories.some((cat) => cat.type === 'movie') ? 'movie' : 'tv';
  const first = categories.find((cat) => cat.type === form);
  return first ? { form, category: first.query } : null;
}

// 每日放送来自 Bangumi，只有一页
export function isBangumiSchedule(query: ListingQuery): boolean {
  return query.channel === 'anime' && query.form === '每日放送';
}

// 自定义分类和每日放送的数据源不支持排序
export function isSortable(query: ListingQuery): boolean {
  return query.channel !== 'custom' && !isBangumiSchedule(query);
}

export function isLegacyListingSearch(params: URLSearchParams): boolean {
  return params.has('primary') || params.has('secondary');
}

export function parseListingQuery(
  params: URLSearchParams,
  today = getTodayWeekday()
): ListingQuery {
  const channel = toChannel(params.get('type'));

  const filters = { ...DEFAULT_FILTERS };
  Object.entries(FILTER_PARAMS).forEach(([key, param]) => {
    const value = params.get(param);
    if (value) filters[key] = value;
  });

  const sortParam = params.get('sort') as SortKey;
  let sort = SORT_KEYS.includes(sortParam) ? sortParam : DEFAULT_SORT;
  let form = params.get('form') || '';
  let category = params.get('category') || '';

  // 旧版 URL：primary / secondary
  const primary = params.get('primary') || '';
  const secondary = params.get('secondary') || '';
  if (channel === 'anime' || channel === 'custom') {
    form = form || primary;
    if (channel === 'custom') category = category || secondary;
  } else {
    if (!params.get('sort') && LEGACY_SORTS[primary]) {
      sort = LEGACY_SORTS[primary];
    }
    if (filters.region === 'all' && LEGACY_REGIONS[secondary]) {
      filters.region = LEGACY_REGIONS[secondary];
    }
  }

  if (channel === 'anime' && !ANIME_FORMS.includes(form)) {
    form = getDefaultForm(channel);
  }
  if (channel !== 'anime' && channel !== 'custom') form = '';

  const page = Math.floor(Number(params.get('page')));

  return {
    channel,
    form,
    category: channel === 'custom' ? category : '',
    filters,
    sort,
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

  params.set('type', query.channel);
  if (query.form && query.form !== getDefaultForm(query.channel)) {
    params.set('form', query.form);
  }
  if (query.category) params.set('category', query.category);
  Object.entries(FILTER_PARAMS).forEach(([key, param]) => {
    const value = query.filters[key];
    if (value && value !== DEFAULT_FILTERS[key]) params.set(param, value);
  });
  if (isSortable(query) && query.sort !== DEFAULT_SORT) {
    params.set('sort', query.sort);
  }
  if (isBangumiSchedule(query) && query.weekday !== today) {
    params.set('weekday', query.weekday);
  }
  if (query.page > 1) params.set('page', String(query.page));

  return params.toString();
}

export function getListingKey(query: ListingQuery): string {
  return JSON.stringify([
    query.channel,
    query.form,
    query.category,
    Object.keys(DEFAULT_FILTERS).map((key) => query.filters[key]),
    isSortable(query) ? query.sort : '',
    isBangumiSchedule(query) ? query.weekday : '',
    query.page,
  ]);
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
