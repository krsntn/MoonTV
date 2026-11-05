// 返回（后退、前进、刷新）时恢复页面位置：纵向位置、横向行的位置、点击过的卡片和视图状态
// 原因：body 才是滚动容器（globals.css 为阻止 iOS 回弹设置了 height: 100%），浏览器和 Next.js 只恢复 window 的位置

import { RefObject, useEffect, useLayoutEffect, useRef } from 'react';

// 每条历史记录在 history.state 里的 id。Next.js 刷新和前进后退时保留 state，新的导航会生成不带 id 的新 state
const ENTRY_KEY = '__krsnEntry';
const STORAGE_KEY = 'krsntv:positions';
const MAX_RECORDS = 50;
const PERSIST_DELAY = 300;

export type ContentStatus = 'loading' | 'ready' | 'error';

// 点击的卡片：返回时把它放回屏幕上原来的位置，横竖屏切换后列数不同也能对上
interface ClickedCard {
  card: string;
  row?: string;
  top: number;
  left: number;
}

export interface EntryRecord {
  top: number;
  rows: Record<string, number>;
  clicked?: ClickedCard;
  state: Record<string, string>;
}

// 内存中的记录供页面内前进后退使用，sessionStorage 中的副本供刷新后使用
let records: Map<string, EntryRecord> | null = null;
let active: { id: string; url: string } | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const rows = new Map<string, HTMLElement>();
const pendingRows = new Map<string, number>();

function getRecords(): Map<string, EntryRecord> {
  if (!records) {
    records = new Map();
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(STORAGE_KEY) || '[]'
      ) as [string, EntryRecord][];
      saved.forEach(([id, record]) => records?.set(id, record));
    } catch {
      // sessionStorage 不可用或内容损坏时只用内存中的记录
    }
  }
  return records;
}

function persist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(getRecords()))
    );
  } catch {
    // 写入失败时刷新后无法恢复，页面内的前进后退不受影响
  }
}

function schedulePersist() {
  if (!persistTimer) persistTimer = setTimeout(persist, PERSIST_DELAY);
}

function readEntryId(): string | undefined {
  return window.history.state?.[ENTRY_KEY];
}

function writeEntryId(id: string) {
  // state 中带有 Next.js 的 __NA，打过补丁的 replaceState 会直接写入，不触发路由
  window.history.replaceState(
    { ...window.history.state, [ENTRY_KEY]: id },
    ''
  );
}

function createId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// 进入当前历史记录。返回之前保存的记录（副本）；新的历史记录返回 null
export function enterEntry(): EntryRecord | null {
  const map = getRecords();
  const existingId = readEntryId();
  const id = existingId || createId();
  const record = existingId ? map.get(existingId) : undefined;

  if (!existingId) writeEntryId(id);
  // 最近进入的记录排在最后，超出上限时先删除最早的
  map.delete(id);
  map.set(id, record || { top: 0, rows: {}, state: {} });
  if (map.size > MAX_RECORDS) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }

  active = { id, url: window.location.href };
  schedulePersist();
  return record ? JSON.parse(JSON.stringify(record)) : null;
}

export function leaveEntry() {
  active = null;
  persist();
}

// 只有当前历史记录仍是进入时的那条，才写入它的记录
function currentRecord(): EntryRecord | undefined {
  if (!active) return;
  const id = readEntryId();
  if (id !== active.id) {
    // Next.js 的部分路由更新会重写 state 并丢掉 id；地址没变说明仍是同一条历史记录
    if (id || window.location.href !== active.url) return;
    writeEntryId(active.id);
  }
  return getRecords().get(active.id);
}

export function savePageTop(top: number) {
  const record = currentRecord();
  if (!record) return;
  record.top = top;
  // 点击卡片后又滚动过，卡片已不在点击时的位置
  record.clicked = undefined;
  schedulePersist();
}

// transform（卡片悬停时放大）不改变布局，按中心点和布局尺寸换算
function layoutBox(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  return {
    top: rect.top + (rect.height - height) / 2,
    left: rect.left + (rect.width - width) / 2,
    width,
    height,
  };
}

export function saveClick(target: EventTarget | null, top: number) {
  const record = currentRecord();
  if (!record) return;
  record.top = top;
  const card =
    target instanceof Element
      ? target.closest<HTMLElement>('[data-card-key]')
      : null;
  if (card?.dataset.cardKey) {
    const box = layoutBox(card);
    record.clicked = {
      card: card.dataset.cardKey,
      row: card.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey,
      top: box.top,
      left: box.left,
    };
  } else {
    record.clicked = undefined;
  }
  schedulePersist();
}

export function saveRowLeft(rowKey: string, left: number) {
  const record = currentRecord();
  if (!record) return;
  record.rows[rowKey] = left;
  schedulePersist();
}

// 保存当前历史记录的视图状态（例如首页的 Tab），返回时由 useScrollRestore 交还给页面
export function saveEntryState(name: string, value: string) {
  const record = currentRecord();
  if (!record) return;
  record.state[name] = value;
  schedulePersist();
}

// 让 [offset, offset + size] 落在 [start, end] 内；放不下时贴住 start
export function clampOffset(
  offset: number,
  size: number,
  start: number,
  end: number
): number {
  return Math.max(start, Math.min(offset, end - size));
}

function restoreRow(rowKey: string) {
  const left = pendingRows.get(rowKey);
  const row = rows.get(rowKey);
  if (left === undefined || !row) return;
  // 内容还不够宽时等卡片加载
  if (row.scrollWidth - row.clientWidth < left - 1) return;
  row.scrollLeft = left;
  pendingRows.delete(rowKey);
}

function findCard(clicked: ClickedCard): HTMLElement | undefined {
  const scope = clicked.row ? rows.get(clicked.row) : document;
  if (!scope) return;
  return Array.from(
    scope.querySelectorAll<HTMLElement>('[data-card-key]')
  ).find((element) => element.dataset.cardKey === clicked.card);
}

function restorePage(record: EntryRecord) {
  const body = document.body;
  const { clicked } = record;
  const card = clicked && findCard(clicked);

  if (clicked && card) {
    const box = layoutBox(card);
    body.scrollTop +=
      box.top - clampOffset(clicked.top, box.height, 0, body.clientHeight);
    const row = clicked.row ? rows.get(clicked.row) : undefined;
    if (row) {
      const rowBox = row.getBoundingClientRect();
      row.scrollLeft +=
        box.left -
        clampOffset(clicked.left, box.width, rowBox.left, rowBox.right);
    }
    return;
  }

  body.scrollTop = record.top;
  // 点击的卡片已不在行中：这一行也按像素位置恢复
  const left = clicked?.row ? record.rows[clicked.row] : undefined;
  if (clicked?.row && left !== undefined) {
    pendingRows.set(clicked.row, left);
    restoreRow(clicked.row);
  }
}

function handleBodyScroll() {
  savePageTop(document.body.scrollTop);
}

function handleClick(event: MouseEvent) {
  saveClick(event.target, document.body.scrollTop);
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

// 用户在内容加载期间自己滚动或操作，就不再跳转
const CANCEL_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'];

/**
 * 页面级的位置恢复。
 * viewKey：页面在不重新挂载的情况下切换历史记录时（例如换结果页）会变化的值。
 * status：当前 viewKey 的内容状态；ready 时恢复一次，error 时放弃。
 * onReturn：返回已有的历史记录时，交还之前用 saveEntryState 保存的视图状态。
 */
export function useScrollRestore(
  viewKey: string,
  status: ContentStatus,
  onReturn?: (state: Record<string, string>) => void
) {
  const pending = useRef<EntryRecord | null>(null);
  const entry = useRef({ isReturn: false });
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  useIsomorphicLayoutEffect(() => {
    const record = enterEntry();
    pending.current = record;
    entry.current.isReturn = Boolean(record);

    pendingRows.clear();
    if (record) {
      Object.entries(record.rows).forEach(([rowKey, left]) => {
        // 点击的卡片所在的行由 restorePage 按卡片对齐
        if (rowKey !== record.clicked?.row) pendingRows.set(rowKey, left);
      });
      rows.forEach((_, rowKey) => restoreRow(rowKey));
      onReturnRef.current?.(record.state);
    }

    const cancel = () => {
      pending.current = null;
    };
    CANCEL_EVENTS.forEach((name) =>
      document.addEventListener(name, cancel, { capture: true, passive: true })
    );
    return () => {
      CANCEL_EVENTS.forEach((name) =>
        document.removeEventListener(name, cancel, { capture: true })
      );
      leaveEntry();
    };
  }, [viewKey]);

  useIsomorphicLayoutEffect(() => {
    const record = pending.current;
    if (!record || status === 'loading') return;
    pending.current = null;
    if (status === 'ready') restorePage(record);
  }, [viewKey, status]);

  useEffect(() => {
    document.body.addEventListener('scroll', handleBodyScroll, {
      passive: true,
    });
    document.addEventListener('click', handleClick, true);
    window.addEventListener('pagehide', persist);
    return () => {
      document.body.removeEventListener('scroll', handleBodyScroll);
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('pagehide', persist);
    };
  }, []);

  return entry;
}

// 横向行的位置恢复：行的内容足够宽时恢复一次，用户先操作这一行则放弃
export function useRowRestore(
  rowKey: string | undefined,
  ref: RefObject<HTMLElement>
) {
  useEffect(() => {
    const row = ref.current;
    if (!rowKey || !row) return;

    rows.set(rowKey, row);
    restoreRow(rowKey);

    const handleScroll = () => saveRowLeft(rowKey, row.scrollLeft);
    const cancel = () => pendingRows.delete(rowKey);
    const observer = new MutationObserver(() => restoreRow(rowKey));
    observer.observe(row, { childList: true, subtree: true });
    row.addEventListener('scroll', handleScroll, { passive: true });
    CANCEL_EVENTS.forEach((name) =>
      row.addEventListener(name, cancel, { passive: true })
    );

    return () => {
      observer.disconnect();
      row.removeEventListener('scroll', handleScroll);
      CANCEL_EVENTS.forEach((name) => row.removeEventListener(name, cancel));
      if (rows.get(rowKey) === row) rows.delete(rowKey);
    };
  }, [rowKey, ref]);
}

// 仅供测试：清空内存中的记录，模拟刷新后从 sessionStorage 读取
export function clearPositionMemory() {
  records = null;
  active = null;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  rows.clear();
  pendingRows.clear();
}
