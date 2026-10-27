import {
  isMasterPlaylist,
  removeAdBlocks,
  rewritePlaylistUris,
} from '@/lib/m3u8';

const BASE = 'https://cdn.example.com/video/20261001/abc/index.m3u8';

function segments(count: number, prefix: string, duration = 6) {
  return Array.from(
    { length: count },
    (_, i) => `#EXTINF:${duration}.000000,\n${prefix}${i}.ts`
  ).join('\n');
}

const HEADER =
  '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:0';

describe('removeAdBlocks', () => {
  it('removes short blocks served from another path (360zy, ikunzy, bfzyapi)', () => {
    const playlist = [
      HEADER,
      segments(20, 'seg'),
      '#EXT-X-DISCONTINUITY',
      segments(4, '/ads/20260101/ad', 4.5),
      '#EXT-X-DISCONTINUITY',
      segments(30, 'seg2-'),
      '#EXT-X-ENDLIST',
    ].join('\n');

    const result = removeAdBlocks(playlist, BASE);

    expect(result).not.toContain('/ads/');
    expect(result.match(/#EXTINF/g)).toHaveLength(50);
    // 两段正片之间保留一个 DISCONTINUITY
    expect(result.match(/#EXT-X-DISCONTINUITY/g)).toHaveLength(1);
    expect(result.startsWith('#EXTM3U')).toBe(true);
    expect(result.trim().endsWith('#EXT-X-ENDLIST')).toBe(true);
  });

  it('keeps playlists that use DISCONTINUITY for the video itself (rycjapi, zuidazy)', () => {
    const parts = Array.from({ length: 10 }, (_, i) =>
      segments(5, `p${i}-`, 4)
    );
    const playlist = [
      HEADER,
      parts.join('\n#EXT-X-DISCONTINUITY\n'),
      '#EXT-X-ENDLIST',
    ].join('\n');

    expect(removeAdBlocks(playlist, BASE)).toBe(playlist);
  });

  it('keeps short blocks on the same path, which may be part of the video', () => {
    const playlist = [
      HEADER,
      segments(20, 'seg'),
      '#EXT-X-DISCONTINUITY',
      segments(4, 'other', 4),
      '#EXT-X-DISCONTINUITY',
      segments(20, 'more'),
      '#EXT-X-ENDLIST',
    ].join('\n');

    expect(removeAdBlocks(playlist, BASE)).toBe(playlist);
  });

  it('keeps long blocks from another path', () => {
    const playlist = [
      HEADER,
      segments(20, 'seg'),
      '#EXT-X-DISCONTINUITY',
      segments(20, 'https://other.example.com/part2/s'),
      '#EXT-X-ENDLIST',
    ].join('\n');

    expect(removeAdBlocks(playlist, BASE)).toBe(playlist);
  });

  it('returns playlists without DISCONTINUITY unchanged', () => {
    const playlist = [HEADER, segments(10, 'seg'), '#EXT-X-ENDLIST'].join('\n');
    expect(removeAdBlocks(playlist, BASE)).toBe(playlist);
  });
});

describe('isMasterPlaylist', () => {
  it('detects variant streams', () => {
    expect(
      isMasterPlaylist(
        '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n720/index.m3u8'
      )
    ).toBe(true);
    expect(isMasterPlaylist(HEADER)).toBe(false);
  });
});

describe('rewritePlaylistUris', () => {
  it('makes segment and key URIs absolute', () => {
    const playlist = [
      HEADER,
      '#EXT-X-KEY:METHOD=AES-128,URI="key.key"',
      '#EXTINF:6.0,',
      'seg0.ts',
      '#EXTINF:6.0,',
      '/root/seg1.ts',
    ].join('\n');

    const result = rewritePlaylistUris(playlist, BASE, (url) => url);

    expect(result).toContain(
      'URI="https://cdn.example.com/video/20261001/abc/key.key"'
    );
    expect(result).toContain(
      'https://cdn.example.com/video/20261001/abc/seg0.ts'
    );
    expect(result).toContain('https://cdn.example.com/root/seg1.ts');
  });

  it('passes variant playlists through the callback', () => {
    const master =
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n720/index.m3u8';
    const result = rewritePlaylistUris(master, BASE, (url, kind) =>
      kind === 'playlist' ? `PROXY(${url})` : url
    );
    expect(result).toContain(
      'PROXY(https://cdn.example.com/video/20261001/abc/720/index.m3u8)'
    );
  });
});
