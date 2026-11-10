// 播放 Speed 的步进规则：播放页的 −0.1 / +0.1 按钮和 , / . 快捷键共用

export const MIN_SPEED = 0.5;
export const MAX_SPEED = 3;
export const SPEED_STEP = 0.1;

// 保留一位小数，避免 1.1 + 0.1 得到 1.2000000000000002
function roundSpeed(speed: number): number {
  return Math.round(speed * 10) / 10;
}

export function stepSpeed(speed: number, delta: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, roundSpeed(speed + delta)));
}

// 已到上限或下限时，对应方向的按钮不可用
export function canStepSpeed(speed: number, delta: number): boolean {
  return stepSpeed(speed, delta) !== roundSpeed(speed);
}
