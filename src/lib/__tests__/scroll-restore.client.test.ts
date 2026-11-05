import {
  clampOffset,
  clearPositionMemory,
  enterEntry,
  leaveEntry,
  saveClick,
  saveEntryState,
  savePageTop,
  saveRowLeft,
} from '@/lib/scroll-restore.client';

// 模拟 Next.js：新的导航生成不带自定义字段的新 state
function navigate(url: string) {
  window.history.pushState({ __NA: true }, '', url);
}

beforeEach(() => {
  clearPositionMemory();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('enterEntry', () => {
  it('treats a new history entry as a new visit', () => {
    navigate('/douban?type=movie');
    expect(enterEntry()).toBeNull();
  });

  it('returns the saved position when the user comes back to the entry', () => {
    navigate('/douban?type=movie');
    enterEntry();
    savePageTop(1200);
    leaveEntry();

    navigate('/play?title=a');
    enterEntry();
    leaveEntry();
    window.history.back();

    return new Promise<void>((resolve) => {
      window.addEventListener(
        'popstate',
        () => {
          expect(enterEntry()?.top).toBe(1200);
          resolve();
        },
        { once: true }
      );
    });
  });

  it('starts a new visit to the same URL at the top', () => {
    navigate('/douban?type=movie');
    enterEntry();
    savePageTop(1200);
    leaveEntry();

    navigate('/douban?type=movie');
    expect(enterEntry()).toBeNull();
  });

  it('restores the position after a reload', () => {
    navigate('/douban?type=movie');
    enterEntry();
    savePageTop(800);
    saveEntryState('tab', 'favorites');
    leaveEntry();

    // 刷新：内存清空，history.state 保留
    clearPositionMemory();
    expect(enterEntry()).toMatchObject({
      top: 800,
      state: { tab: 'favorites' },
    });
  });

  it('returns a copy, so later saves do not change a pending restore', () => {
    navigate('/douban?type=movie');
    enterEntry();
    savePageTop(500);
    leaveEntry();

    const record = enterEntry();
    savePageTop(0);
    expect(record?.top).toBe(500);
  });

  it('keeps only the 50 most recently entered records', () => {
    navigate('/first');
    enterEntry();
    savePageTop(100);
    leaveEntry();
    const firstState = window.history.state;

    for (let i = 0; i < 50; i++) {
      navigate(`/page-${i}`);
      enterEntry();
      leaveEntry();
    }

    window.history.replaceState(firstState, '', '/first');
    expect(enterEntry()).toBeNull();
  });
});

describe('saves', () => {
  it('ignores saves after the history entry changed', () => {
    navigate('/douban?type=movie');
    enterEntry();
    savePageTop(300);
    const listingState = window.history.state;

    // 点击卡片后 Next.js 先压入 /play 的历史记录，旧页面稍后才卸载
    navigate('/play?title=a');
    savePageTop(0);
    leaveEntry();

    window.history.replaceState(listingState, '', '/douban?type=movie');
    expect(enterEntry()?.top).toBe(300);
  });

  it('keeps the id when Next.js rewrites the state of the same entry', () => {
    navigate('/douban?type=movie');
    enterEntry();
    window.history.replaceState({ __NA: true }, '');
    savePageTop(700);
    leaveEntry();

    expect(enterEntry()?.top).toBe(700);
  });

  it('records the clicked card and its row', () => {
    document.body.innerHTML = `
      <div data-row-key="shelf-热门电影">
        <div data-card-key="douban-1"><span id="poster"></span></div>
      </div>`;
    navigate('/');
    enterEntry();
    saveClick(document.getElementById('poster'), 400);
    saveRowLeft('shelf-热门电影', 900);
    leaveEntry();

    expect(enterEntry()).toMatchObject({
      top: 400,
      rows: { 'shelf-热门电影': 900 },
      clicked: { card: 'douban-1', row: 'shelf-热门电影' },
    });
  });

  it('forgets the clicked card after the user scrolls', () => {
    document.body.innerHTML = '<div data-card-key="douban-1"></div>';
    navigate('/douban?type=movie');
    enterEntry();
    saveClick(document.querySelector('[data-card-key]'), 400);
    savePageTop(900);
    leaveEntry();

    const record = enterEntry();
    expect(record?.top).toBe(900);
    expect(record?.clicked).toBeUndefined();
  });

  it('forgets the clicked card after a click outside a card', () => {
    document.body.innerHTML =
      '<div data-card-key="douban-1"></div><button>2</button>';
    navigate('/douban?type=movie');
    enterEntry();
    saveClick(document.querySelector('[data-card-key]'), 400);
    saveClick(document.querySelector('button'), 2400);
    leaveEntry();

    const record = enterEntry();
    expect(record?.top).toBe(2400);
    expect(record?.clicked).toBeUndefined();
  });
});

describe('clampOffset', () => {
  it('keeps an offset that fits', () => {
    expect(clampOffset(300, 200, 0, 800)).toBe(300);
  });

  it('moves a card that would end below the viewport back into view', () => {
    // 竖屏时卡片在 700，横屏视口只有 400 高
    expect(clampOffset(700, 150, 0, 400)).toBe(250);
  });

  it('moves a card above the start back to the start', () => {
    expect(clampOffset(-50, 150, 0, 400)).toBe(0);
  });

  it('aligns a card larger than the area to the start', () => {
    expect(clampOffset(100, 500, 20, 400)).toBe(20);
  });
});
