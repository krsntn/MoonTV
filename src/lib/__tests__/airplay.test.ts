/**
 * @jest-environment node
 */
import { webcrypto } from 'crypto';

import {
  AIRPLAY_LINK_TTL_SECONDS,
  buildAirPlayPlaylistUrl,
  verifyAirPlayLink,
} from '@/lib/airplay';

// Jest 27 的 node 环境没有全局 crypto；Edge 运行时和 Node 22 都有
Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

const ORIGIN = 'https://tv.example.com';
const UPSTREAM = 'https://cdn.example.com/a/index.m3u8';
const NOW = Date.UTC(2026, 9, 27, 3, 0, 0);

async function paramsOf(link: string) {
  return new URL(link).searchParams;
}

describe('AirPlay playlist links', () => {
  it('accepts a signed link before it expires', async () => {
    const link = await buildAirPlayPlaylistUrl(ORIGIN, UPSTREAM, 'secret', NOW);
    expect(link.startsWith(`${ORIGIN}/api/airplay/playlist.m3u8?`)).toBe(true);

    const later = NOW + (AIRPLAY_LINK_TTL_SECONDS - 60) * 1000;
    await expect(
      verifyAirPlayLink(await paramsOf(link), 'secret', later)
    ).resolves.toEqual({ ok: true, url: UPSTREAM });
  });

  it('rejects an expired link', async () => {
    const link = await buildAirPlayPlaylistUrl(ORIGIN, UPSTREAM, 'secret', NOW);
    const expired = NOW + (AIRPLAY_LINK_TTL_SECONDS + 60) * 1000;
    await expect(
      verifyAirPlayLink(await paramsOf(link), 'secret', expired)
    ).resolves.toEqual({ ok: false, status: 403 });
  });

  it('rejects a link for another URL or with another secret', async () => {
    const params = await paramsOf(
      await buildAirPlayPlaylistUrl(ORIGIN, UPSTREAM, 'secret', NOW)
    );
    await expect(verifyAirPlayLink(params, 'other', NOW)).resolves.toEqual({
      ok: false,
      status: 403,
    });

    params.set('u', 'https://evil.example.com/x.m3u8');
    await expect(verifyAirPlayLink(params, 'secret', NOW)).resolves.toEqual({
      ok: false,
      status: 403,
    });
  });

  it('does not sign when no password is set', async () => {
    const link = await buildAirPlayPlaylistUrl(
      ORIGIN,
      UPSTREAM,
      undefined,
      NOW
    );
    const params = await paramsOf(link);
    expect(params.has('sig')).toBe(false);
    await expect(verifyAirPlayLink(params, undefined, NOW)).resolves.toEqual({
      ok: true,
      url: UPSTREAM,
    });
  });

  it('rejects links that are not http or https', async () => {
    const params = new URLSearchParams({ u: 'file:///etc/passwd' });
    await expect(verifyAirPlayLink(params, undefined, NOW)).resolves.toEqual({
      ok: false,
      status: 400,
    });
  });
});
