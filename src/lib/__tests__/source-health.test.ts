import {
  COOLDOWN_MS,
  filterAvailableSources,
  isSourceAvailable,
  recordSourceFailure,
  recordSourceSuccess,
  resetSourceHealth,
} from '@/lib/source-health';

const NOW = 1_000_000;

beforeEach(() => {
  resetSourceHealth();
});

describe('source health', () => {
  it('skips a Source after 3 failures in a row', () => {
    recordSourceFailure('a', NOW);
    recordSourceFailure('a', NOW);
    expect(isSourceAvailable('a', NOW)).toBe(true);

    recordSourceFailure('a', NOW);
    expect(isSourceAvailable('a', NOW)).toBe(false);
  });

  it('resets the count after a success', () => {
    recordSourceFailure('a', NOW);
    recordSourceFailure('a', NOW);
    recordSourceSuccess('a');
    recordSourceFailure('a', NOW);
    expect(isSourceAvailable('a', NOW)).toBe(true);
  });

  it('tries the Source again after the cooldown, and skips it again on one more failure', () => {
    for (let i = 0; i < 3; i++) recordSourceFailure('a', NOW);

    const later = NOW + COOLDOWN_MS;
    expect(isSourceAvailable('a', later)).toBe(true);

    recordSourceFailure('a', later);
    expect(isSourceAvailable('a', later)).toBe(false);
  });

  it('keeps all Sources when every Source is skipped', () => {
    for (let i = 0; i < 3; i++) {
      recordSourceFailure('a', NOW);
      recordSourceFailure('b', NOW);
    }
    const sources = [{ key: 'a' }, { key: 'b' }];
    expect(filterAvailableSources(sources, NOW)).toEqual({
      available: sources,
      skipped: [],
    });
  });

  it('splits available and skipped Sources', () => {
    for (let i = 0; i < 3; i++) recordSourceFailure('a', NOW);
    expect(filterAvailableSources([{ key: 'a' }, { key: 'b' }], NOW)).toEqual({
      available: [{ key: 'b' }],
      skipped: [{ key: 'a' }],
    });
  });
});
