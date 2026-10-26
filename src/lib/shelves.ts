// Shelf：首页上带标题的一行内容，显示对应 Listing 的第一个结果页

import {
  Channel,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  getDefaultForm,
  getTodayWeekday,
  ListingQuery,
} from './listing';

export interface Shelf {
  title: string;
  query: ListingQuery;
}

function shelf(
  title: string,
  channel: Channel,
  overrides: Partial<ListingQuery> = {}
): Shelf {
  return {
    title,
    query: {
      channel,
      form: getDefaultForm(channel),
      category: '',
      filters: { ...DEFAULT_FILTERS },
      sort: DEFAULT_SORT,
      weekday: getTodayWeekday(),
      page: 1,
      ...overrides,
    },
  };
}

export function getHomeShelves(): Shelf[] {
  return [
    shelf('热门电影', 'movie'),
    shelf('热门剧集', 'tv'),
    shelf('新番放送', 'anime'),
    shelf('热门综艺', 'show'),
  ];
}
