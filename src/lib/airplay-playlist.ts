// 电视通过 AirPlay 请求的播放列表：取上游播放列表，去除插入的广告片段，片段地址改为绝对地址；
// 清晰度变体也指向 AirPlay 播放列表路由

import { buildAirPlayPlaylistUrl } from './airplay';
import { isMasterPlaylist, removeAdBlocks, rewritePlaylistUris } from './m3u8';

export type AirPlayPlaylist =
  | { type: 'playlist'; body: string }
  // 服务器取不到上游播放列表时（部分 CDN 拦截 Vercel 或超时），让电视自己去取原始地址
  | { type: 'redirect'; url: string };

type Fetcher = (
  url: string,
  init: RequestInit
) => Promise<{
  ok: boolean;
  status: number;
  url: string;
  text(): Promise<string>;
}>;

export async function loadAirPlayPlaylist(
  upstreamUrl: string,
  origin: string,
  secret: string | undefined,
  fetcher: Fetcher = fetch
): Promise<AirPlayPlaylist> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let text: string;
  let baseUrl: string;
  try {
    const response = await fetcher(upstreamUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      },
    });
    if (!response.ok) return { type: 'redirect', url: upstreamUrl };
    text = await response.text();
    baseUrl = response.url || upstreamUrl;
  } catch {
    return { type: 'redirect', url: upstreamUrl };
  } finally {
    clearTimeout(timeoutId);
  }

  if (isMasterPlaylist(text)) {
    const variants: string[] = [];
    rewritePlaylistUris(text, baseUrl, (url, kind) => {
      if (kind === 'playlist') variants.push(url);
      return url;
    });
    const signed = new Map<string, string>();
    await Promise.all(
      variants.map(async (url) =>
        signed.set(url, await buildAirPlayPlaylistUrl(origin, url, secret))
      )
    );
    return {
      type: 'playlist',
      body: rewritePlaylistUris(text, baseUrl, (url, kind) =>
        kind === 'playlist' ? signed.get(url) || url : url
      ),
    };
  }

  return {
    type: 'playlist',
    body: rewritePlaylistUris(
      removeAdBlocks(text, baseUrl),
      baseUrl,
      (url) => url
    ),
  };
}
