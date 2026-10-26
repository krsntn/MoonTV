// Shelf：首页或频道页上带标题的一行内容，每个 Shelf 对应 Listing 的第一页

import {
  Channel,
  DEFAULT_FILTERS,
  getChannelDefaults,
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
      ...getChannelDefaults(channel),
      filters: { ...DEFAULT_FILTERS },
      weekday: getTodayWeekday(),
      page: 1,
      ...overrides,
    },
  };
}

function genre(title: string): Shelf {
  return shelf(title, 'movie', {
    primary: '全部',
    filters: { ...DEFAULT_FILTERS, type: title },
  });
}

export function getChannelShelves(channel: Channel): Shelf[] {
  switch (channel) {
    case 'movie':
      return [
        shelf('热门电影', 'movie'),
        shelf('最新电影', 'movie', { primary: '最新' }),
        shelf('豆瓣高分', 'movie', { primary: '豆瓣高分' }),
        genre('喜剧'),
        genre('动作'),
        genre('爱情'),
      ];
    case 'tv':
      return [
        shelf('最近热门', 'tv'),
        shelf('国产剧', 'tv', { secondary: 'tv_domestic' }),
        shelf('欧美剧', 'tv', { secondary: 'tv_american' }),
        shelf('韩剧', 'tv', { secondary: 'tv_korean' }),
        shelf('日剧', 'tv', { secondary: 'tv_japanese' }),
        shelf('纪录片', 'tv', { secondary: 'tv_documentary' }),
      ];
    case 'show':
      return [
        shelf('最近热门', 'show'),
        shelf('国内综艺', 'show', { secondary: 'show_domestic' }),
        shelf('国外综艺', 'show', { secondary: 'show_foreign' }),
      ];
    case 'anime':
      return [
        shelf('今日放送', 'anime'),
        shelf('番剧', 'anime', { primary: '番剧' }),
        shelf('剧场版', 'anime', { primary: '剧场版' }),
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
