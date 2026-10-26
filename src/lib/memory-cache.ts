// 服务端内存缓存：同一进程内共享，进程重启后清空
// 同一 key 的并发请求共享一次加载；加载失败的结果不缓存

interface Entry {
  value: unknown;
  expires: number;
}

const MAX_ENTRIES = 500;

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>
): Promise<T> {
  const entry = store.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.value as T;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = load()
    .then((value) => {
      store.delete(key);
      store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
      if (store.size > MAX_ENTRIES) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function clearMemoryCache(): void {
  store.clear();
  inflight.clear();
}
