'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo } from 'react';

import { toChannel } from '@/lib/listing';
import { getChannelShelves } from '@/lib/shelves';

import PageLayout from '@/components/PageLayout';
import ShelfRow from '@/components/ShelfRow';

const CHANNEL_TITLES: Record<string, string> = {
  movie: '电影',
  tv: '电视剧',
  show: '综艺',
  anime: '动漫',
};

// 频道页：频道的入口，每个 Shelf 链接到带筛选条件的 Listing
function ChannelPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channel = toChannel(searchParams.get('type'));
  const shelves = useMemo(() => getChannelShelves(channel), [channel]);

  // 自定义频道没有频道页，直接进入 Listing
  useEffect(() => {
    if (channel === 'custom') router.replace('/douban?type=custom');
  }, [channel, router]);

  return (
    <PageLayout activePath={`/channel?type=${channel}`}>
      <div className='px-2 sm:px-10 py-4 sm:py-8 overflow-visible'>
        <div className='mb-6 sm:mb-8 flex items-end justify-between'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200'>
              {CHANNEL_TITLES[channel] || ''}
            </h1>
            <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
              来自豆瓣的精选内容
            </p>
          </div>
          <Link
            href={`/douban?type=${channel}`}
            className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          >
            全部筛选
            <ChevronRight className='w-4 h-4 ml-1' />
          </Link>
        </div>

        <div className='max-w-[95%] mx-auto'>
          {shelves.map((shelf) => (
            <ShelfRow key={shelf.title} shelf={shelf} />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

export default function ChannelPage() {
  return (
    <Suspense>
      <ChannelPageClient />
    </Suspense>
  );
}
