/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Airplay } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AirPlayButtonProps {
  // 当前播放器的 video 元素；播放器重建时会变化
  video: HTMLVideoElement | null;
}

// 播放页的大号 AirPlay 按钮：只在支持 AirPlay 的浏览器（Safari）中显示
export default function AirPlayButton({ video }: AirPlayButtonProps) {
  const [supported, setSupported] = useState(false);
  const [available, setAvailable] = useState(false);
  const [wireless, setWireless] = useState(false);

  // 在挂载后检测，避免服务端渲染和客户端不一致
  useEffect(() => {
    setSupported('WebKitPlaybackTargetAvailabilityEvent' in window);
  }, []);

  useEffect(() => {
    if (!video || !supported) return;

    // 添加监听后 Safari 会立即派发一次当前的可用状态
    const handleAvailability = (event: Event) => {
      setAvailable((event as any).availability === 'available');
    };
    const handleWireless = () => {
      setWireless(
        Boolean((video as any).webkitCurrentPlaybackTargetIsWireless)
      );
    };

    video.addEventListener(
      'webkitplaybacktargetavailabilitychanged',
      handleAvailability
    );
    video.addEventListener(
      'webkitcurrentplaybacktargetiswirelesschanged',
      handleWireless
    );
    handleWireless();

    return () => {
      video.removeEventListener(
        'webkitplaybacktargetavailabilitychanged',
        handleAvailability
      );
      video.removeEventListener(
        'webkitcurrentplaybacktargetiswirelesschanged',
        handleWireless
      );
    };
  }, [video, supported]);

  if (!supported) return null;

  const handleClick = () => {
    // 必须在点击事件中调用，浏览器才会打开 AirPlay 设备列表
    (video as any)?.webkitShowPlaybackTargetPicker?.();
  };

  const disabled = !video || (!available && !wireless);
  const label = wireless
    ? '正在 AirPlay 播放 · 点击切换设备'
    : available
    ? 'AirPlay 投屏'
    : '未找到 AirPlay 设备';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-xl py-3 text-base font-medium transition-colors duration-200 ${
        wireless
          ? 'bg-green-500 text-white hover:bg-green-600'
          : disabled
          ? 'cursor-not-allowed bg-gray-800/50 text-gray-500'
          : 'border border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700'
      }`}
    >
      <Airplay className='h-5 w-5' />
      {label}
    </button>
  );
}
