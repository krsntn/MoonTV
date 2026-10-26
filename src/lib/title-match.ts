// 播放页按标题匹配 Source 的搜索结果。
// Source 标题常带语言或版本后缀（如“璀璨之城国语”“璀璨之城粤语版”），比较时去掉这些后缀

const LANGUAGE_SUFFIX =
  /[（(【[]?(?:国粤双语|国粤|双语|国语|粤语|普通话|英语|日语|韩语|原声)版?[）)】\]]?$/;

export function normalizeTitle(title: string): string {
  const compact = title.replace(/\s+/g, '').toLowerCase();
  const stripped = compact.replace(LANGUAGE_SUFFIX, '');
  // 标题本身就是语言词时（例如“国语”）保留原样
  return stripped || compact;
}

export function isTitleMatch(
  resultTitle: string,
  wantedTitle: string
): boolean {
  return normalizeTitle(resultTitle) === normalizeTitle(wantedTitle);
}

// 结尾是“粤语”（可带“版”和括号）的版本
const CANTONESE_SUFFIX = /[（(【[]?粤语版?[）)】\]]?$/;

// 同一作品有多个语言版本时优先粤语，没有粤语版本时保持原顺序
export function pickPreferredVersion<T extends { title: string }>(
  results: T[]
): T | undefined {
  return (
    results.find((result) =>
      CANTONESE_SUFFIX.test(result.title.replace(/\s+/g, ''))
    ) ?? results[0]
  );
}
