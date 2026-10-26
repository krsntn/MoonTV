// Listing 筛选面板的行和选项：选项值就是豆瓣标签（中文），'all' 表示不筛选

import {
  CustomCategory,
  isBangumiSchedule,
  ListingQuery,
  SortKey,
} from './listing';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterRow {
  // filters 中的 key，或 form / category / weekday
  key: string;
  label: string;
  // 行首的“全部”选项；没有时该行必须选择一项
  allLabel?: string;
  options: FilterOption[];
}

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'U', label: '近期热度' },
  { key: 'T', label: '综合' },
  { key: 'R', label: '最新' },
  { key: 'S', label: '高分' },
];

const MOVIE_GENRES = [
  '喜剧',
  '爱情',
  '动作',
  '科幻',
  '悬疑',
  '犯罪',
  '惊悚',
  '冒险',
  '音乐',
  '历史',
  '奇幻',
  '恐怖',
  '战争',
  '传记',
  '歌舞',
  '武侠',
  '情色',
  '灾难',
  '西部',
  '纪录片',
  '短片',
];

const TV_GENRES = [
  '喜剧',
  '爱情',
  '悬疑',
  '武侠',
  '古装',
  '家庭',
  '犯罪',
  '科幻',
  '恐怖',
  '历史',
  '战争',
  '动作',
  '冒险',
  '传记',
  '剧情',
  '奇幻',
  '惊悚',
  '灾难',
  '歌舞',
  '音乐',
];

const SHOW_TYPES = ['真人秀', '脱口秀', '音乐', '歌舞'];

const MOVIE_REGIONS = [
  '华语',
  '欧美',
  '韩国',
  '日本',
  '中国大陆',
  '美国',
  '中国香港',
  '中国台湾',
  '英国',
  '法国',
  '德国',
  '意大利',
  '西班牙',
  '印度',
  '泰国',
  '俄罗斯',
  '加拿大',
  '澳大利亚',
  '爱尔兰',
  '瑞典',
  '巴西',
  '丹麦',
];

const TV_REGIONS = [
  '华语',
  '欧美',
  '国外',
  '韩国',
  '日本',
  '中国大陆',
  '中国香港',
  '美国',
  '英国',
  '泰国',
  '中国台湾',
  '意大利',
  '法国',
  '德国',
  '西班牙',
  '俄罗斯',
  '瑞典',
  '巴西',
  '丹麦',
  '印度',
  '加拿大',
  '爱尔兰',
  '澳大利亚',
];

const ANIME_MOVIE_LABELS = [
  '定格动画',
  '传记',
  '美国动画',
  '爱情',
  '黑色幽默',
  '歌舞',
  '儿童',
  '二次元',
  '动物',
  '青春',
  '历史',
  '励志',
  '恶搞',
  '治愈',
  '运动',
  '后宫',
  '情色',
  '人性',
  '悬疑',
  '恋爱',
  '魔幻',
  '科幻',
];

const ANIME_TV_LABELS = [
  '黑色幽默',
  '历史',
  '歌舞',
  '励志',
  '恶搞',
  '治愈',
  '运动',
  '后宫',
  '情色',
  '国漫',
  '人性',
  '悬疑',
  '恋爱',
  '魔幻',
  '科幻',
];

const PLATFORMS = [
  '腾讯视频',
  '爱奇艺',
  '优酷',
  '湖南卫视',
  'Netflix',
  'HBO',
  'BBC',
  'NHK',
  'CBS',
  'NBC',
  'tvN',
];

const WEEKDAYS: FilterOption[] = [
  { label: '周一', value: 'Mon' },
  { label: '周二', value: 'Tue' },
  { label: '周三', value: 'Wed' },
  { label: '周四', value: 'Thu' },
  { label: '周五', value: 'Fri' },
  { label: '周六', value: 'Sat' },
  { label: '周日', value: 'Sun' },
];

// 今年及之前 4 年，然后按年代（2020年代、2010年代、2000年代、90年代……60年代）和“更早”
export function getYearOptions(now = new Date()): string[] {
  const year = now.getFullYear();
  const recent = Array.from({ length: 5 }, (_, i) => String(year - i));
  const decades: string[] = [];
  for (let decade = Math.floor(year / 10) * 10; decade >= 1960; decade -= 10) {
    decades.push(
      decade >= 2000 ? `${decade}年代` : `${String(decade).slice(2)}年代`
    );
  }
  return [...recent, ...decades, '更早'];
}

function toOptions(values: string[]): FilterOption[] {
  return values.map((value) => ({ label: value, value }));
}

function filterRow(key: string, label: string, values: string[]): FilterRow {
  return { key, label, allLabel: `全部${label}`, options: toOptions(values) };
}

export function getFilterRows(
  query: ListingQuery,
  customCategories: CustomCategory[],
  now = new Date()
): FilterRow[] {
  const years = filterRow('year', '年代', getYearOptions(now));
  const platforms = filterRow('platform', '平台', PLATFORMS);

  switch (query.channel) {
    case 'movie':
      return [
        filterRow('type', '类型', MOVIE_GENRES),
        filterRow('region', '地区', MOVIE_REGIONS),
        years,
      ];
    case 'tv':
      return [
        filterRow('type', '类型', TV_GENRES),
        filterRow('region', '地区', TV_REGIONS),
        years,
        platforms,
      ];
    case 'show':
      return [
        filterRow('type', '类型', SHOW_TYPES),
        filterRow('region', '地区', TV_REGIONS),
        years,
        platforms,
      ];
    case 'anime': {
      const forms: FilterRow = {
        key: 'form',
        label: '形式',
        options: toOptions(['番剧', '剧场版', '每日放送']),
      };
      if (isBangumiSchedule(query)) {
        return [forms, { key: 'weekday', label: '星期', options: WEEKDAYS }];
      }
      const isSeries = query.form === '番剧';
      return [
        forms,
        filterRow(
          'label',
          '类型',
          isSeries ? ANIME_TV_LABELS : ANIME_MOVIE_LABELS
        ),
        filterRow('region', '地区', isSeries ? TV_REGIONS : MOVIE_REGIONS),
        years,
        ...(isSeries ? [platforms] : []),
      ];
    }
    case 'custom': {
      const kinds = [
        { label: '电影', value: 'movie' },
        { label: '剧集', value: 'tv' },
      ].filter((kind) =>
        customCategories.some((cat) => cat.type === kind.value)
      );
      return [
        { key: 'form', label: '类型', options: kinds },
        {
          key: 'category',
          label: '分类',
          options: customCategories
            .filter((cat) => cat.type === query.form)
            .map((cat) => ({ label: cat.name || cat.query, value: cat.query })),
        },
      ];
    }
  }
}
