import { cached, clearMemoryCache } from '@/lib/memory-cache';

beforeEach(() => {
  clearMemoryCache();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('cached', () => {
  it('returns the cached value until the TTL expires', async () => {
    const load = jest.fn().mockResolvedValueOnce('a').mockResolvedValue('b');

    await expect(cached('key', 60, load)).resolves.toBe('a');
    await expect(cached('key', 60, load)).resolves.toBe('a');
    expect(load).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(61 * 1000);
    await expect(cached('key', 60, load)).resolves.toBe('b');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one load between concurrent requests', async () => {
    let resolve: (value: string) => void = () => undefined;
    const load = jest.fn(() => new Promise<string>((r) => (resolve = r)));

    const first = cached('key', 60, load);
    const second = cached('key', 60, load);
    resolve('value');

    await expect(Promise.all([first, second])).resolves.toEqual([
      'value',
      'value',
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure', async () => {
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error('HTTP error! Status: 429'))
      .mockResolvedValue('value');

    await expect(cached('key', 60, load)).rejects.toThrow('429');
    await expect(cached('key', 60, load)).resolves.toBe('value');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps separate values for separate keys', async () => {
    await cached('a', 60, async () => 1);
    await cached('b', 60, async () => 2);

    await expect(cached('a', 60, async () => 3)).resolves.toBe(1);
    await expect(cached('b', 60, async () => 3)).resolves.toBe(2);
  });
});
