import { verifyAirPlayLink } from '@/lib/airplay';
import { loadAirPlayPlaylist } from '@/lib/airplay-playlist';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// 电视通过 AirPlay 直接请求的播放列表。电视没有登录 Cookie，
// 所以这个路由不经过登录校验，只校验链接签名
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const secret = process.env.PASSWORD;

  const verified = await verifyAirPlayLink(searchParams, secret);
  if (!verified.ok) {
    return new Response('Forbidden', { status: verified.status });
  }

  const playlist = await loadAirPlayPlaylist(verified.url, origin, secret);
  if (playlist.type === 'redirect') {
    return new Response(null, {
      status: 302,
      headers: { Location: playlist.url, 'Cache-Control': 'no-store' },
    });
  }

  return new Response(playlist.body, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
