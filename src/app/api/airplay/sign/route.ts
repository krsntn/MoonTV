import { NextResponse } from 'next/server';

import { buildAirPlayPlaylistUrl, isHttpUrl } from '@/lib/airplay';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// 为播放地址生成给电视使用的 AirPlay 播放列表链接（需要登录，由 middleware 校验）
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const url = searchParams.get('url') || '';
  if (!isHttpUrl(url)) {
    return NextResponse.json({ error: '无效的播放地址' }, { status: 400 });
  }

  const link = await buildAirPlayPlaylistUrl(origin, url, process.env.PASSWORD);
  return NextResponse.json(
    { url: link },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
