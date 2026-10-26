/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import {
  buildListingSearch,
  getListingKey,
  isBangumiSchedule,
} from '@/lib/listing';
import {
  loadResultPage,
  peekResultPage,
  ResultPage,
} from '@/lib/listing.client';
import { Shelf } from '@/lib/shelves';

import ScrollableRow from '@/components/ScrollableRow';
import VideoCard from '@/components/VideoCard';

const CARD_CLASS = 'min-w-[96px] w-24 sm:min-w-[180px] sm:w-44';

export default function ShelfRow({ shelf }: { shelf: Shelf }) {
  const { title, query } = shelf;
  const key = getListingKey(query);
  const [resultPage, setResultPage] = useState<ResultPage | null>(
    () => peekResultPage(query) || null
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    peekResultPage(query) ? 'ready' : 'loading'
  );
  const [retryCount, setRetryCount] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  // 接近视口时才加载：频道页一次只请求前几个 Shelf，减少对豆瓣的突发请求
  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Shelf 与 Listing 第一页共用同一个缓存条目
  useEffect(() => {
    if (!visible) return;
    const cached = peekResultPage(query);
    if (cached) {
      setResultPage(cached);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    loadResultPage(query, [])
      .then((page) => {
        if (cancelled) return;
        setResultPage(page);
        setStatus('ready');
      })
      .catch((err) => {
        console.error(`获取 ${title} 失败:`, err);
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [key, retryCount, visible]);

  const items = resultPage?.items || [];

  return (
    <section ref={sectionRef} className='mb-8'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
          {title}
        </h2>
        <Link
          href={`/douban?${buildListingSearch(query)}`}
          className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        >
          查看更多
          <ChevronRight className='w-4 h-4 ml-1' />
        </Link>
      </div>

      {status === 'error' ? (
        <div className='flex items-center gap-4 py-8 text-sm text-gray-500 dark:text-gray-400'>
          加载失败
          <button
            onClick={() => setRetryCount((count) => count + 1)}
            className='px-3 py-1 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors duration-200'
          >
            重试
          </button>
        </div>
      ) : status === 'ready' && items.length === 0 ? (
        <div className='py-8 text-sm text-gray-500 dark:text-gray-400'>
          暂无相关内容
        </div>
      ) : (
        <ScrollableRow>
          {status === 'loading'
            ? // 加载状态显示灰色占位数据
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className={CARD_CLASS}>
                  <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                    <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                  </div>
                  <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                </div>
              ))
            : items.map((item, index) => (
                <div key={`${item.id}-${index}`} className={CARD_CLASS}>
                  <VideoCard
                    from='douban'
                    title={item.title}
                    poster={item.poster}
                    douban_id={Number(item.id)}
                    rate={item.rate}
                    year={item.year}
                    type={query.channel === 'movie' ? 'movie' : ''}
                    isBangumi={isBangumiSchedule(query)}
                  />
                </div>
              ))}
        </ScrollableRow>
      )}
    </section>
  );
}
