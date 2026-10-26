import { isTitleMatch, pickPreferredVersion } from '@/lib/title-match';

describe('isTitleMatch', () => {
  it('matches Source titles that add a language suffix', () => {
    // 2026-10-26：25 个 Source 都只有带后缀的“璀璨之城”，播放页因此找不到任何结果
    expect(isTitleMatch('璀璨之城国语', '璀璨之城')).toBe(true);
    expect(isTitleMatch('璀璨之城粤语', '璀璨之城')).toBe(true);
    expect(isTitleMatch('璀璨之城国语版', '璀璨之城')).toBe(true);
    expect(isTitleMatch('璀璨之城（粤语版）', '璀璨之城')).toBe(true);
    expect(isTitleMatch('璀璨之城[国粤双语]', '璀璨之城')).toBe(true);
  });

  it('ignores spaces and letter case', () => {
    expect(isTitleMatch(' 璀璨 之城 ', '璀璨之城')).toBe(true);
    expect(isTitleMatch('Love Actually', 'love actually')).toBe(true);
  });

  it('matches when both titles carry the same suffix', () => {
    expect(isTitleMatch('璀璨之城国语', '璀璨之城国语')).toBe(true);
  });

  it('still rejects other titles', () => {
    expect(isTitleMatch('予她璀璨星河', '璀璨之城')).toBe(false);
    expect(isTitleMatch('璀璨之城2', '璀璨之城')).toBe(false);
    expect(isTitleMatch('璀璨之城番外篇', '璀璨之城')).toBe(false);
  });

  it('keeps a title that is only a language word', () => {
    expect(isTitleMatch('国语', '粤语')).toBe(false);
    expect(isTitleMatch('国语', '国语')).toBe(true);
  });
});

describe('pickPreferredVersion', () => {
  const result = (title: string) => ({ title });

  it('prefers the Cantonese version when it exists', () => {
    expect(
      pickPreferredVersion([result('璀璨之城国语'), result('璀璨之城粤语')])
        ?.title
    ).toBe('璀璨之城粤语');
    expect(
      pickPreferredVersion([
        result('璀璨之城国语版'),
        result('璀璨之城（粤语版）'),
      ])?.title
    ).toBe('璀璨之城（粤语版）');
  });

  it('keeps the first result when there is no Cantonese version', () => {
    expect(
      pickPreferredVersion([result('璀璨之城国语'), result('璀璨之城')])?.title
    ).toBe('璀璨之城国语');
  });

  it('does not treat 粤语 inside a title as a version', () => {
    expect(
      pickPreferredVersion([result('粤语残片'), result('粤语残片粤语')])?.title
    ).toBe('粤语残片粤语');
  });
});
