/**
 * @jest-environment node
 */
import { loadAirPlayPlaylist } from '@/lib/airplay-playlist';

const UPSTREAM = 'https://cdn.example.com/a/index.m3u8';
const ORIGIN = 'https://tv.example.com';

function fakeFetch(response: { ok: boolean; status?: number; body?: string }) {
  return jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    url: UPSTREAM,
    text: async () => response.body ?? '',
  });
}

describe('loadAirPlayPlaylist', () => {
  it('redirects the TV to the original link when the server cannot fetch it', async () => {
    // 2026-10-29：生产环境中 hongniuzy2、jinyingzy、jyzyapi 的播放列表 Vercel 取不到，
    // 路由返回 502，电视因此无法播放这些 Source
    const failing = jest.fn().mockRejectedValue(new Error('timeout'));
    await expect(
      loadAirPlayPlaylist(UPSTREAM, ORIGIN, undefined, failing)
    ).resolves.toEqual({ type: 'redirect', url: UPSTREAM });

    const blocked = fakeFetch({ ok: false, status: 403 });
    await expect(
      loadAirPlayPlaylist(UPSTREAM, ORIGIN, undefined, blocked)
    ).resolves.toEqual({ type: 'redirect', url: UPSTREAM });
  });

  it('removes ad blocks from a media playlist and makes links absolute', async () => {
    const body = [
      '#EXTM3U',
      '#EXT-X-TARGETDURATION:6',
      ...Array.from({ length: 20 }, (_, i) => `#EXTINF:6.0,\nseg${i}.ts`),
      '#EXT-X-DISCONTINUITY',
      ...Array.from({ length: 4 }, (_, i) => `#EXTINF:4.5,\n/ads/x/ad${i}.ts`),
      '#EXT-X-DISCONTINUITY',
      ...Array.from({ length: 20 }, (_, i) => `#EXTINF:6.0,\nmore${i}.ts`),
      '#EXT-X-ENDLIST',
    ].join('\n');

    const result = await loadAirPlayPlaylist(
      UPSTREAM,
      ORIGIN,
      undefined,
      fakeFetch({ ok: true, body })
    );

    expect(result.type).toBe('playlist');
    if (result.type !== 'playlist') return;
    expect(result.body).not.toContain('/ads/');
    expect(result.body).toContain('https://cdn.example.com/a/seg0.ts');
  });

  it('routes quality variants through the AirPlay playlist route', async () => {
    const master =
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n720/index.m3u8';
    const result = await loadAirPlayPlaylist(
      UPSTREAM,
      ORIGIN,
      undefined,
      fakeFetch({ ok: true, body: master })
    );

    expect(result.type).toBe('playlist');
    if (result.type !== 'playlist') return;
    expect(result.body).toContain(
      `${ORIGIN}/api/airplay/playlist.m3u8?u=${encodeURIComponent(
        'https://cdn.example.com/a/720/index.m3u8'
      )}`
    );
  });
});
