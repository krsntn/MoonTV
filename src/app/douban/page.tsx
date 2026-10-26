/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getCustomCategories } from '@/lib/config.client';
import {
  areFiltersEqual,
  buildListingSearch,
  CustomCategory,
  DEFAULT_FILTERS,
  getCustomDefaults,
  getListingKey,
  isBangumiSchedule,
  ListingQuery,
  parseListingQuery,
  RESULT_PAGE_SIZE,
} from '@/lib/listing';
import {
  loadResultPage,
  peekResultPage,
  prefetchResultPage,
  ResultPage,
} from '@/lib/listing.client';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanCustomSelector from '@/components/DoubanCustomSelector';
import DoubanSelector from '@/components/DoubanSelector';
import PageLayout from '@/components/PageLayout';
import Pagination from '@/components/Pagination';
import VideoCard from '@/components/VideoCard';

// 生成骨架屏数据
const skeletonData = Array.from({ length: RESULT_PAGE_SIZE }, (_, i) => i);

function DoubanPageClient() {
  const searchParams = useSearchParams();

  // URL 是 Listing 状态的唯一来源
  const query = useMemo(
    () => parseListingQuery(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const queryKey = getListingKey(query);
  const type = query.channel;

  // 获取 runtimeConfig 中的自定义分类数据（null 表示尚未加载）
  const [customCategories, setCustomCategories] = useState<
    CustomCategory[] | null
  >(null);
  const [resultPage, setResultPage] = useState<ResultPage | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [retryCount, setRetryCount] = useState(0);

  // 获取自定义分类数据
  useEffect(() => {
    getCustomCategories()
      .then(setCustomCategories)
      .catch((err) => {
        console.error(err);
        setCustomCategories([]);
      });
  }, []);

  const navigate = useCallback(
    (next: ListingQuery, mode: 'push' | 'replace' = 'push') => {
      const url = `${window.location.pathname}?${buildListingSearch(next)}`;
      if (mode === 'push') {
        window.history.pushState(null, '', url);
      } else {
        window.history.replaceState(null, '', url);
      }
    },
    []
  );

  // 自定义频道：分类加载后补全默认的一级和二级选择
  useEffect(() => {
    if (type !== 'custom' || !customCategories || query.primary) return;
    const defaults = getCustomDefaults(customCategories);
    if (defaults) navigate({ ...query, ...defaults }, 'replace');
  }, [queryKey, customCategories]);

  // 自定义频道需要等待分类加载完成
  const ready =
    type !== 'custom' ||
    (customCategories !== null &&
      (customCategories.length === 0 || Boolean(query.primary)));

  // 加载当前结果页；参数变化时丢弃旧请求的结果
  useEffect(() => {
    if (!ready) return;

    const cached = peekResultPage(query);
    if (cached) {
      setResultPage(cached);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setResultPage(null);

    loadResultPage(query, customCategories || [])
      .then((page) => {
        if (cancelled) return;
        setResultPage(page);
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey, ready, retryCount]);

  // 处理分页变化
  const handlePageChange = useCallback(
    (page: number) => {
      navigate({ ...query, page });

      try {
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        document.body.scrollTop = 0;
      }
    },
    [query, navigate]
  );

  const handlePagePrefetch = useCallback(
    (page: number) => {
      if (!ready) return;
      prefetchResultPage({ ...query, page }, customCategories || []);
    },
    [query, ready, customCategories]
  );

  // 处理选择器变化：筛选变化后回到第一页
  const handlePrimaryChange = useCallback(
    (value: string) => {
      if (value === query.primary) return;

      let secondary = query.secondary;
      if (type === 'custom') {
        const firstCategory = customCategories?.find(
          (cat) => cat.type === value
        );
        if (firstCategory) secondary = firstCategory.query;
      } else if ((type === 'tv' || type === 'show') && value === '最近热门') {
        secondary = type;
      }

      navigate({
        ...query,
        primary: value,
        secondary,
        filters: { ...DEFAULT_FILTERS },
        page: 1,
      });
    },
    [query, customCategories, navigate]
  );

  const handleSecondaryChange = useCallback(
    (value: string) => {
      if (value === query.secondary) return;
      navigate({ ...query, secondary: value, page: 1 });
    },
    [query, navigate]
  );

  const handleMultiLevelChange = useCallback(
    (values: Record<string, string>) => {
      if (areFiltersEqual(values, query.filters)) return;
      navigate({ ...query, filters: values, page: 1 });
    },
    [query, navigate]
  );

  const handleWeekdayChange = useCallback(
    (weekday: string) => {
      if (weekday === query.weekday) return;
      navigate({ ...query, weekday, page: 1 });
    },
    [query, navigate]
  );

  const getPageTitle = () => {
    // 根据 type 生成标题
    return type === 'movie'
      ? '电影'
      : type === 'tv'
      ? '电视剧'
      : type === 'anime'
      ? '动漫'
      : type === 'show'
      ? '综艺'
      : '自定义';
  };

  const getPageDescription = () => {
    if (isBangumiSchedule(query)) {
      return '来自 Bangumi 番组计划的精选内容';
    }
    return '来自豆瓣的精选内容';
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);

    const queryString = params.toString();
    const activePath = `/douban${queryString ? `?${queryString}` : ''}`;
    return activePath;
  };

  const items = resultPage?.items || [];
  const totalPages = resultPage?.totalPages || 1;

  return (
    <PageLayout activePath={getActivePath()}>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 页面标题和选择器 */}
        <div className='mb-6 sm:mb-8 space-y-4 sm:space-y-6'>
          {/* 页面标题 */}
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200'>
              {getPageTitle()}
            </h1>
            <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
              {getPageDescription()}
            </p>
          </div>

          {/* 选择器组件 */}
          {type !== 'custom' ? (
            <div className='bg-white/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'>
              <DoubanSelector
                type={type}
                primarySelection={query.primary}
                secondarySelection={query.secondary}
                multiLevelValues={query.filters}
                selectedWeekday={query.weekday}
                onPrimaryChange={handlePrimaryChange}
                onSecondaryChange={handleSecondaryChange}
                onMultiLevelChange={handleMultiLevelChange}
                onWeekdayChange={handleWeekdayChange}
              />
            </div>
          ) : (
            <div className='bg-white/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'>
              <DoubanCustomSelector
                customCategories={customCategories || []}
                primarySelection={query.primary}
                secondarySelection={query.secondary}
                onPrimaryChange={handlePrimaryChange}
                onSecondaryChange={handleSecondaryChange}
              />
            </div>
          )}
        </div>

        {/* 内容展示区域 */}
        <div className='max-w-[95%] mx-auto mt-8 overflow-visible'>
          {/* 内容网格 */}
          <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20'>
            {status === 'loading'
              ? // 显示骨架屏
                skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
              : // 显示实际数据
                items.map((item, index) => (
                  <div key={`${item.title}-${index}`} className='w-full'>
                    <VideoCard
                      from='douban'
                      title={item.title}
                      poster={item.poster}
                      douban_id={Number(item.id)}
                      rate={item.rate}
                      year={item.year}
                      type={type === 'movie' ? 'movie' : ''} // 电影类型严格控制，tv 不控
                      isBangumi={isBangumiSchedule(query)}
                    />
                  </div>
                ))}
          </div>

          {/* Pagination */}
          {status === 'ready' && items.length > 0 && totalPages > 1 && (
            <div className='flex justify-center mt-12 py-8'>
              <Pagination
                currentPage={query.page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onPagePrefetch={handlePagePrefetch}
              />
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className='text-center py-8'>
              <p className='text-gray-500'>加载失败，请稍后重试</p>
              <button
                onClick={() => setRetryCount((count) => count + 1)}
                className='mt-4 px-4 py-2 text-sm rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors duration-200'
              >
                重试
              </button>
            </div>
          )}

          {/* Empty State */}
          {status === 'ready' && items.length === 0 && (
            <div className='text-center text-gray-500 py-8'>暂无相关内容</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}
