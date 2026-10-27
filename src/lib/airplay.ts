// AirPlay 播放列表链接的签名：电视请求时没有登录 Cookie，靠签名和过期时间防止链接被当作公开代理使用。
// 签名密钥是 PASSWORD；未设置 PASSWORD 时网站本身就是开放的，链接不签名

export const AIRPLAY_LINK_TTL_SECONDS = 12 * 60 * 60;

export const AIRPLAY_PLAYLIST_PATH = '/api/airplay/playlist.m3u8';

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// 长度相同时逐字符比较，避免按时间差推测签名
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function buildAirPlayPlaylistUrl(
  origin: string,
  upstreamUrl: string,
  secret: string | undefined,
  now = Date.now()
): Promise<string> {
  const params = new URLSearchParams({ u: upstreamUrl });
  if (secret) {
    const exp = String(Math.floor(now / 1000) + AIRPLAY_LINK_TTL_SECONDS);
    params.set('exp', exp);
    params.set('sig', await hmacHex(secret, `${upstreamUrl}\n${exp}`));
  }
  return `${origin}${AIRPLAY_PLAYLIST_PATH}?${params.toString()}`;
}

export async function verifyAirPlayLink(
  params: URLSearchParams,
  secret: string | undefined,
  now = Date.now()
): Promise<{ ok: true; url: string } | { ok: false; status: number }> {
  const url = params.get('u') || '';
  if (!isHttpUrl(url)) return { ok: false, status: 400 };
  if (!secret) return { ok: true, url };

  const exp = Number(params.get('exp'));
  if (!Number.isFinite(exp) || exp * 1000 < now) {
    return { ok: false, status: 403 };
  }
  const expected = await hmacHex(secret, `${url}\n${params.get('exp')}`);
  if (!safeEqual(params.get('sig') || '', expected)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, url };
}
