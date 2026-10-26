import { getFilterRows, getYearOptions } from '@/lib/filters';
import {
  buildListingSearch,
  DEFAULT_FILTERS,
  getCustomDefaults,
  getListingKey,
  getTotalPages,
  isLegacyListingSearch,
  isSortable,
  parseListingQuery,
} from '@/lib/listing';

const TODAY = 'Mon';

function parse(search: string) {
  return parseListingQuery(new URLSearchParams(search), TODAY);
}

describe('parseListingQuery', () => {
  it('uses the defaults when the URL has only the type', () => {
    expect(parse('type=tv')).toEqual({
      channel: 'tv',
      form: '',
      category: '',
      filters: DEFAULT_FILTERS,
      sort: 'U',
      weekday: TODAY,
      page: 1,
    });
  });

  it('falls back to the movie Channel for an unknown type', () => {
    expect(parse('type=unknown').channel).toBe('movie');
  });

  it('reads filters, sort and page from the URL', () => {
    const query = parse(
      'type=movie&genre=喜剧&region=华语&year=2026&sort=S&page=3'
    );
    expect(query.filters).toEqual({
      ...DEFAULT_FILTERS,
      type: '喜剧',
      region: '华语',
      year: '2026',
    });
    expect(query.sort).toBe('S');
    expect(query.page).toBe(3);
  });

  it('ignores an unknown sort and an invalid page', () => {
    const query = parse('type=movie&sort=X&page=-2');
    expect(query.sort).toBe('U');
    expect(query.page).toBe(1);
  });

  it('shows the Bangumi schedule by default on the anime Channel', () => {
    expect(parse('type=anime').form).toBe('每日放送');
    expect(parse('type=anime&form=剧场版').form).toBe('剧场版');
  });
});

describe('old links', () => {
  it('maps the curated lists to sorts and regions', () => {
    const query = parse('type=movie&primary=最新&secondary=华语');
    expect(query.sort).toBe('R');
    expect(query.filters.region).toBe('华语');
  });

  it('maps the TV categories to regions', () => {
    const query = parse('type=tv&primary=最近热门&secondary=tv_domestic');
    expect(query.sort).toBe('U');
    expect(query.filters.region).toBe('中国大陆');
  });

  it('maps the anime and custom selections', () => {
    expect(parse('type=anime&primary=番剧').form).toBe('番剧');
    const custom = parse('type=custom&primary=tv&secondary=美剧');
    expect(custom.form).toBe('tv');
    expect(custom.category).toBe('美剧');
  });

  it('detects old links so the page can rewrite them', () => {
    expect(isLegacyListingSearch(new URLSearchParams('primary=热门'))).toBe(
      true
    );
    expect(isLegacyListingSearch(new URLSearchParams('sort=U'))).toBe(false);
  });
});

describe('buildListingSearch', () => {
  it('writes only the values that differ from the defaults', () => {
    expect(buildListingSearch(parse('type=movie'), TODAY)).toBe('type=movie');
  });

  it('round-trips a filtered Result page through the URL', () => {
    const query = parse('type=tv&genre=悬疑&platform=Netflix&sort=T&page=2');
    expect(parse(buildListingSearch(query, TODAY))).toEqual(query);
  });

  it('rewrites an old link in the new format', () => {
    expect(
      parse(buildListingSearch(parse('type=movie&primary=豆瓣高分'), TODAY))
    ).toEqual(parse('type=movie&sort=S'));
  });

  it('writes the weekday only for the Bangumi schedule', () => {
    expect(buildListingSearch(parse('type=anime&weekday=Fri'), TODAY)).toBe(
      'type=anime&weekday=Fri'
    );
    const movie = { ...parse('type=movie'), weekday: 'Fri' };
    expect(buildListingSearch(movie, TODAY)).not.toContain('weekday');
  });
});

describe('getListingKey', () => {
  it('differs between sorts and Result pages', () => {
    const keys = new Set(
      ['type=movie', 'type=movie&sort=S', 'type=movie&page=2'].map((search) =>
        getListingKey(parse(search))
      )
    );
    expect(keys.size).toBe(3);
  });

  it('ignores the sort where it does not apply', () => {
    expect(isSortable(parse('type=anime'))).toBe(false);
    expect(getListingKey(parse('type=anime'))).toBe(
      getListingKey({ ...parse('type=anime'), sort: 'S' })
    );
  });
});

describe('getTotalPages', () => {
  it('uses the total from Douban', () => {
    expect(getTotalPages(95, 1, 30)).toBe(4);
    expect(getTotalPages(0, 1, 0)).toBe(1);
  });

  it('allows one more page when the total is unknown and the page is full', () => {
    expect(getTotalPages(undefined, 2, 30)).toBe(3);
    expect(getTotalPages(undefined, 2, 12)).toBe(2);
  });
});

describe('getCustomDefaults', () => {
  it('prefers the movie categories', () => {
    expect(
      getCustomDefaults([
        { name: 'A', type: 'tv', query: '美剧' },
        { name: 'B', type: 'movie', query: '科幻' },
      ])
    ).toEqual({ form: 'movie', category: '科幻' });
  });

  it('returns null without categories', () => {
    expect(getCustomDefaults([])).toBeNull();
  });
});

describe('getYearOptions', () => {
  it('starts at the current year and ends with the decades', () => {
    expect(getYearOptions(new Date(2026, 5, 1))).toEqual([
      '2026',
      '2025',
      '2024',
      '2023',
      '2022',
      '2020年代',
      '2010年代',
      '2000年代',
      '90年代',
      '80年代',
      '70年代',
      '60年代',
      '更早',
    ]);
  });
});

describe('getFilterRows', () => {
  const keys = (search: string) =>
    getFilterRows(parse(search), []).map((row) => row.key);

  it('shows the rows each Channel supports', () => {
    expect(keys('type=movie')).toEqual(['type', 'region', 'year']);
    expect(keys('type=tv')).toEqual(['type', 'region', 'year', 'platform']);
    expect(keys('type=anime&form=番剧')).toEqual([
      'form',
      'label',
      'region',
      'year',
      'platform',
    ]);
    expect(keys('type=anime&form=剧场版')).toEqual([
      'form',
      'label',
      'region',
      'year',
    ]);
  });

  it('shows only the weekday row for the Bangumi schedule', () => {
    expect(keys('type=anime')).toEqual(['form', 'weekday']);
  });

  it('lists the custom categories of the selected type', () => {
    const rows = getFilterRows(parse('type=custom&form=tv&category=美剧'), [
      { name: '美剧', type: 'tv', query: '美剧' },
      { name: '', type: 'movie', query: '科幻' },
    ]);
    expect(rows[0].options.map((option) => option.value)).toEqual([
      'movie',
      'tv',
    ]);
    expect(rows[1].options).toEqual([{ label: '美剧', value: '美剧' }]);
  });
});
