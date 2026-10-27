import { buildAirPlayPlaylistUrl, verifyAirPlayLink } from '@/lib/airplay';
import {
  isMasterPlaylist,
  removeAdBlocks,
  rewritePlaylistUris,
} from '@/lib/m3u8';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// 电视通过 AirPlay 直接请求的播放列表：去除插入的广告片段，片段地址改为绝对地址。
// 电视没有登录 Cookie，所以这个路由不经过登录校验，只校验链接签名
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const secret = process.env.PASSWORD;

  const verified = await verifyAirPlayLink(searchParams, secret);
  if (!verified.ok) {
    return new Response('Forbidden', { status: verified.status });
  }
  const upstreamUrl = verified.url;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let text: string;
  let baseUrl: string;
  try {
    const response = await fetch(upstreamUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      },
    });
    if (!response.ok) {
      return new Response(`Upstream ${response.status}`, { status: 502 });
    }
    text = await response.text();
    baseUrl = response.url || upstreamUrl;
  } catch {
    return new Response('Upstream unavailable', { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }

  let body: string;
  if (isMasterPlaylist(text)) {
    // 清晰度变体也指向本路由，才能同样去除广告
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
    body = rewritePlaylistUris(text, baseUrl, (url, kind) =>
      kind === 'playlist' ? signed.get(url) || url : url
    );
  } else {
    body = rewritePlaylistUris(
      removeAdBlocks(text, baseUrl),
      baseUrl,
      (url) => url
    );
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
