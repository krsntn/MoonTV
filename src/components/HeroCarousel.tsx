/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { Play } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { loadResultPage } from '@/lib/listing.client';
import { getHomeShelves } from '@/lib/shelves';
import { DoubanItem } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

interface HeroItem extends DoubanItem {
  channelLabel: string;
  isMovie: boolean;
}

const ITEMS_PER_CHANNEL = 3;
const ROTATE_INTERVAL = 6000;

// 首页大图轮播：豆瓣只有竖版海报，用模糊海报作背景、清晰海报放在一侧
export default function HeroCarousel() {
  const router = useRouter();
  const [items, setItems] = useState<HeroItem[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // 与首页的热门电影和热门剧集 Shelf 共用请求，不产生额外请求
  useEffect(() => {
    let cancelled = false;
    const [movies, tvShows] = getHomeShelves();

    Promise.allSettled([
      loadResultPage(movies.query, []),
      loadResultPage(tvShows.query, []),
    ]).then(([movieResult, tvResult]) => {
      if (cancelled) return;
      const movieItems =
        movieResult.status === 'fulfilled'
          ? movieResult.value.items.slice(0, ITEMS_PER_CHANNEL)
          : [];
      const tvItems =
        tvResult.status === 'fulfilled'
          ? tvResult.value.items.slice(0, ITEMS_PER_CHANNEL)
          : [];

      // 电影和剧集交替排列
      const merged: HeroItem[] = [];
      for (let i = 0; i < ITEMS_PER_CHANNEL; i++) {
        if (movieItems[i]) {
          merged.push({
            ...movieItems[i],
            channelLabel: '电影',
            isMovie: true,
          });
        }
        if (tvItems[i]) {
          merged.push({ ...tvItems[i], channelLabel: '剧集', isMovie: false });
        }
      }
      setItems(merged);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = setInterval(() => {
      setActive((index) => (index + 1) % items.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, items.length]);

  if (items.length === 0) {
    return (
      <div className='mb-8 h-[220px] sm:h-[360px] rounded-2xl bg-gray-200 animate-pulse dark:bg-gray-800' />
    );
  }

  const item = items[active];
  const poster = processImageUrl(item.poster);

  const handlePlay = () => {
    router.push(
      `/play?title=${encodeURIComponent(item.title.trim())}${
        item.year ? `&year=${item.year}` : ''
      }${item.isMovie ? '&stype=movie' : ''}`
    );
  };

  return (
    <section
      className='relative mb-8 h-[220px] sm:h-[360px] overflow-hidden rounded-2xl bg-gray-900'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 模糊海报背景 */}
      <Image
        key={`bg-${item.id}`}
        src={poster}
        alt=''
        fill
        priority={active === 0}
        referrerPolicy='no-referrer'
        className='object-cover scale-110 blur-2xl opacity-60'
      />
      <div className='absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10' />

      <div className='relative flex h-full items-center gap-4 px-4 sm:gap-8 sm:px-10'>
        {/* 清晰海报 */}
        <div className='relative h-[80%] aspect-[2/3] flex-shrink-0 overflow-hidden rounded-lg shadow-2xl'>
          <Image
            key={`poster-${item.id}`}
            src={poster}
            alt={item.title}
            fill
            priority={active === 0}
            referrerPolicy='no-referrer'
            className='object-cover'
          />
        </div>

        <div className='min-w-0 text-white'>
          <h2 className='truncate text-2xl font-bold sm:text-4xl'>
            {item.title}
          </h2>
          <p className='mt-2 text-sm text-gray-300 sm:text-base'>
            {[item.channelLabel, item.year, item.rate && `豆瓣 ${item.rate}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <button
            onClick={handlePlay}
            className='mt-4 inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors duration-200 sm:mt-6 sm:text-base'
          >
            <Play className='h-4 w-4' fill='currentColor' />
            立即播放
          </button>
        </div>
      </div>

      {/* 切换指示点 */}
      <div className='absolute bottom-3 right-4 flex gap-2 sm:bottom-5 sm:right-8'>
        {items.map((heroItem, index) => (
          <button
            key={heroItem.id}
            onClick={() => setActive(index)}
            aria-label={heroItem.title}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
