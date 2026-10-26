import {
  areFiltersEqual,
  buildListingSearch,
  DEFAULT_FILTERS,
  getCustomDefaults,
  getListingKey,
  getTotalPages,
  parseListingQuery,
} from '@/lib/listing';

const TODAY = 'Mon';

function parse(search: string) {
  return parseListingQuery(new URLSearchParams(search), TODAY);
}

describe('parseListingQuery', () => {
  it('uses the Channel defaults when the URL has only the type', () => {
    expect(parse('type=tv')).toEqual({
      channel: 'tv',
      primary: '最近热门',
      secondary: 'tv',
      filters: DEFAULT_FILTERS,
      weekday: TODAY,
      page: 1,
    });
  });

  it('falls back to the movie Channel for an unknown type', () => {
    expect(parse('type=unknown').channel).toBe('movie');
  });

  it('reads filters, page and weekday from the URL', () => {
    const query = parse(
      'type=movie&primary=全部&genre=喜剧&region=华语&sort=S&page=3'
    );
    expect(query.primary).toBe('全部');
    expect(query.filters).toEqual({
      ...DEFAULT_FILTERS,
      type: '喜剧',
      region: '华语',
      sort: 'S',
    });
    expect(query.page).toBe(3);
  });

  it('treats an invalid page as page 1', () => {
    expect(parse('type=movie&page=abc').page).toBe(1);
    expect(parse('type=movie&page=-2').page).toBe(1);
    expect(parse('type=movie&page=0').page).toBe(1);
  });
});

describe('buildListingSearch', () => {
  it('writes only the values that differ from the defaults', () => {
    expect(buildListingSearch(parse('type=movie'), TODAY)).toBe('type=movie');
  });

  it('round-trips a filtered Result page through the URL', () => {
    const search =
      'type=movie&primary=%E5%85%A8%E9%83%A8&genre=%E5%96%9C%E5%89%A7&page=2';
    const query = parse(search);
    expect(parse(buildListingSearch(query, TODAY))).toEqual(query);
  });

  it('writes the weekday only for the Bangumi schedule', () => {
    const anime = parse('type=anime&weekday=Fri');
    expect(buildListingSearch(anime, TODAY)).toContain('weekday=Fri');

    const movie = { ...parse('type=movie'), weekday: 'Fri' };
    expect(buildListingSearch(movie, TODAY)).not.toContain('weekday');
  });
});

describe('getListingKey', () => {
  it('differs between Result pages of the same Listing', () => {
    const page1 = parse('type=movie');
    const page2 = parse('type=movie&page=2');
    expect(getListingKey(page1)).not.toBe(getListingKey(page2));
  });

  it('ignores the weekday outside the Bangumi schedule', () => {
    const query = parse('type=movie');
    expect(getListingKey(query)).toBe(
      getListingKey({ ...query, weekday: 'Fri' })
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
    ).toEqual({ primary: 'movie', secondary: '科幻' });
  });

  it('returns null without categories', () => {
    expect(getCustomDefaults([])).toBeNull();
  });
});

describe('areFiltersEqual', () => {
  it('treats missing keys as defaults', () => {
    expect(areFiltersEqual({ sort: 'T' }, DEFAULT_FILTERS)).toBe(true);
    expect(areFiltersEqual({ sort: 'S' }, DEFAULT_FILTERS)).toBe(false);
  });
});
