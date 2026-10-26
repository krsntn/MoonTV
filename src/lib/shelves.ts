// Shelf：首页或频道页上带标题的一行内容，显示对应 Listing 的第一个结果页

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

function filtered(key: string, value: string): Partial<ListingQuery> {
  return { filters: { ...DEFAULT_FILTERS, [key]: value } };
}

export function getChannelShelves(channel: Channel): Shelf[] {
  switch (channel) {
    case 'movie':
      return [
        shelf('热门电影', 'movie'),
        shelf('最新电影', 'movie', { sort: 'R' }),
        shelf('豆瓣高分', 'movie', { sort: 'S' }),
        shelf('喜剧', 'movie', filtered('type', '喜剧')),
        shelf('动作', 'movie', filtered('type', '动作')),
        shelf('爱情', 'movie', filtered('type', '爱情')),
      ];
    case 'tv':
      return [
        shelf('最近热门', 'tv'),
        shelf('国产剧', 'tv', filtered('region', '中国大陆')),
        shelf('欧美剧', 'tv', filtered('region', '欧美')),
        shelf('韩剧', 'tv', filtered('region', '韩国')),
        shelf('日剧', 'tv', filtered('region', '日本')),
        shelf('悬疑剧', 'tv', filtered('type', '悬疑')),
      ];
    case 'show':
      return [
        shelf('最近热门', 'show'),
        shelf('国内综艺', 'show', filtered('region', '中国大陆')),
        shelf('国外综艺', 'show', filtered('region', '国外')),
      ];
    case 'anime':
      return [
        shelf('今日放送', 'anime'),
        shelf('番剧', 'anime', { form: '番剧' }),
        shelf('剧场版', 'anime', { form: '剧场版' }),
      ];
    default:
      return [];
  }
}

export function getHomeShelves(): Shelf[] {
  return [
    shelf('热门电影', 'movie'),
    shelf('热门剧集', 'tv'),
    shelf('新番放送', 'anime'),
    shelf('热门综艺', 'show'),
  ];
}
