// Source 健康状态（进程内存，重启后清空）
// 连续失败 3 次后跳过 30 分钟；冷却结束后再试一次，仍失败则继续跳过，成功则恢复

export const FAILURE_THRESHOLD = 3;
export const COOLDOWN_MS = 30 * 60 * 1000;

interface SourceHealth {
  failures: number;
  skipUntil: number;
}

const health = new Map<string, SourceHealth>();

export function isSourceAvailable(key: string, now = Date.now()): boolean {
  const entry = health.get(key);
  return !entry || entry.skipUntil <= now;
}

export function recordSourceSuccess(key: string): void {
  health.delete(key);
}

export function recordSourceFailure(key: string, now = Date.now()): void {
  const entry = health.get(key) ?? { failures: 0, skipUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= FAILURE_THRESHOLD) {
    entry.skipUntil = now + COOLDOWN_MS;
  }
  health.set(key, entry);
}

// 过滤掉冷却中的 Source；如果全部在冷却（例如服务器自身断网），则全部重试
export function filterAvailableSources<T extends { key: string }>(
  sources: T[],
  now = Date.now()
): { available: T[]; skipped: T[] } {
  const available = sources.filter((s) => isSourceAvailable(s.key, now));
  if (available.length === 0) {
    return { available: sources, skipped: [] };
  }
  return {
    available,
    skipped: sources.filter((s) => !isSourceAvailable(s.key, now)),
  };
}

export function resetSourceHealth(): void {
  health.clear();
}
