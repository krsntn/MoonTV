// HLS 播放列表处理（浏览器和服务端共用）：去除插入的广告片段，改写为绝对地址

// 广告块：被 #EXT-X-DISCONTINUITY 分隔、总时长不超过 60 秒、片段与正片来自不同主机或目录
const AD_BLOCK_MAX_SECONDS = 60;

const DISCONTINUITY = '#EXT-X-DISCONTINUITY';

interface Block {
  lines: string[];
  duration: number;
  // 片段所在目录（主机 + 路径）及数量
  dirs: Map<string, number>;
  segments: number;
}

export function isMasterPlaylist(text: string): boolean {
  return text.includes('#EXT-X-STREAM-INF');
}

function segmentDir(uri: string, baseUrl: string): string {
  try {
    const url = new URL(uri, baseUrl);
    return url.host + url.pathname.slice(0, url.pathname.lastIndexOf('/'));
  } catch {
    return '';
  }
}

function majorityDir(dirs: Map<string, number>): string {
  let best = '';
  let bestCount = -1;
  dirs.forEach((count, dir) => {
    if (count > bestCount) {
      best = dir;
      bestCount = count;
    }
  });
  return best;
}

export function removeAdBlocks(text: string, baseUrl: string): string {
  if (!text.includes(DISCONTINUITY) || isMasterPlaylist(text)) return text;

  const lines = text.split('\n');
  const header: string[] = [];
  const blocks: Block[] = [];
  let current: Block | null = null;
  let duration = 0;

  const newBlock = (): Block => {
    const block = { lines: [], duration: 0, dirs: new Map(), segments: 0 };
    blocks.push(block);
    return block;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(DISCONTINUITY)) {
      current = newBlock();
      continue;
    }
    // 第一个片段之前的标签属于文件头
    if (!current && !trimmed.startsWith('#EXTINF')) {
      header.push(line);
      continue;
    }
    if (!current) current = newBlock();
    current.lines.push(line);

    if (trimmed.startsWith('#EXTINF:')) {
      duration = parseFloat(trimmed.slice(8)) || 0;
    } else if (trimmed && !trimmed.startsWith('#')) {
      const dir = segmentDir(trimmed, baseUrl);
      current.dirs.set(dir, (current.dirs.get(dir) || 0) + 1);
      current.duration += duration;
      current.segments += 1;
    }
  }

  // 正片目录：所有片段中最常见的目录
  const allDirs = new Map<string, number>();
  blocks.forEach((block) =>
    block.dirs.forEach((count, dir) =>
      allDirs.set(dir, (allDirs.get(dir) || 0) + count)
    )
  );
  const mainDir = majorityDir(allDirs);

  const isAd = (block: Block) =>
    block.segments > 0 &&
    block.duration <= AD_BLOCK_MAX_SECONDS &&
    majorityDir(block.dirs) !== mainDir;

  if (!blocks.some(isAd)) return text;

  // 去掉广告块；保留下来的相邻块之间仍用 DISCONTINUITY 分隔
  const kept = blocks.filter((block) => !isAd(block));
  const body = kept
    .map((block) => block.lines.join('\n'))
    .filter((part) => part.length > 0)
    .join(`\n${DISCONTINUITY}\n`);
  return [...header, body].join('\n');
}

// 把片段、密钥等地址改写为绝对地址；子播放列表（清晰度变体）交给回调处理，
// 用于服务端代理时把变体也指向代理
export function rewritePlaylistUris(
  text: string,
  baseUrl: string,
  rewrite: (absoluteUrl: string, kind: 'playlist' | 'resource') => string
): string {
  const resolve = (uri: string) => {
    try {
      return new URL(uri, baseUrl).toString();
    } catch {
      return uri;
    }
  };

  let nextIsVariant = false;
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        nextIsVariant = trimmed.startsWith('#EXT-X-STREAM-INF');
        // 标签里的 URI="..."（密钥、初始化片段、音轨等）
        return line.replace(/URI="([^"]+)"/g, (_, uri: string) => {
          const absolute = resolve(uri);
          const kind = /\.m3u8(\?|$)/i.test(absolute) ? 'playlist' : 'resource';
          return `URI="${rewrite(absolute, kind)}"`;
        });
      }
      const absolute = resolve(trimmed);
      const kind =
        nextIsVariant || /\.m3u8(\?|$)/i.test(absolute)
          ? 'playlist'
          : 'resource';
      nextIsVariant = false;
      return rewrite(absolute, kind);
    })
    .join('\n');
}
