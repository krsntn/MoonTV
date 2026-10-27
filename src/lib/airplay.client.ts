// 浏览器端：获取给电视使用的 AirPlay 播放列表链接（去除广告），并缓存

const cache = new Map<string, Promise<string>>();
const resolved = new Map<string, string>();

export function getAirPlayUrl(url: string): Promise<string> {
  const existing = cache.get(url);
  if (existing) return existing;

  const promise = fetch(`/api/airplay/sign?url=${encodeURIComponent(url)}`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data: { url: string }) => {
      resolved.set(url, data.url);
      return data.url;
    })
    .catch(() => {
      // 获取失败时使用原始地址，下次再试
      cache.delete(url);
      return url;
    });
  cache.set(url, promise);
  return promise;
}

// 已获取过的链接，可同步读取
export function peekAirPlayUrl(url: string): string | undefined {
  return resolved.get(url);
}
