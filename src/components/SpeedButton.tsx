'use client';

import { canStepSpeed } from '@/lib/speed';

interface SpeedButtonProps {
  // 当前 Speed；播放器创建前为 null
  speed: number | null;
  // 每次点击的变化量：-0.1 或 +0.1
  delta: number;
  onClick: () => void;
}

// 播放页 AirPlay 按钮两侧的 −0.1 / +0.1 按钮；没有 AirPlay 按钮时两个按钮平分一行
export default function SpeedButton({
  speed,
  delta,
  onClick,
}: SpeedButtonProps) {
  const disabled = speed === null || !canStepSpeed(speed, delta);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={delta > 0 ? '播放速度加 0.1' : '播放速度减 0.1'}
      className={`flex-1 rounded-xl py-3 text-base font-medium tabular-nums transition-colors duration-200 ${
        disabled
          ? 'cursor-not-allowed bg-gray-800/50 text-gray-500'
          : 'border border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700'
      }`}
    >
      {delta > 0 ? '+' : '−'}
      {Math.abs(delta)}
    </button>
  );
}
