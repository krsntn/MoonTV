import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { fetchDoubanData } from '@/lib/douban';
import { cached } from '@/lib/memory-cache';
import { DoubanItem, DoubanResult } from '@/lib/types';

interface DoubanApiResponse {
  subjects: Array<{
    id: string;
    title: string;
    cover: string;
    rate: string;
  }>;
}

// Edge 运行时：在 Vercel 上，Node 函数从项目区域 sin1 访问豆瓣会超时，
// Edge 函数在 iad1 运行，可以正常访问
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
// 所有 fetch 都不进入 Next.js 的 Data Cache（包括存储层的请求）
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const type = searchParams.get('type');
  const tag = searchParams.get('tag');
  const pageSize = parseInt(searchParams.get('pageSize') || '16');
  const pageStart = parseInt(searchParams.get('pageStart') || '0');

  // 验证参数
  if (!type || !tag) {
    return NextResponse.json(
      { error: '缺少必要参数: type 或 tag' },
      { status: 400 }
    );
  }

  if (!['tv', 'movie'].includes(type)) {
    return NextResponse.json(
      { error: 'type 参数必须是 tv 或 movie' },
      { status: 400 }
    );
  }

  if (pageSize < 1 || pageSize > 100) {
    return NextResponse.json(
      { error: 'pageSize 必须在 1-100 之间' },
      { status: 400 }
    );
  }

  if (pageStart < 0) {
    return NextResponse.json(
      { error: 'pageStart 不能小于 0' },
      { status: 400 }
    );
  }

  if (tag === 'top250') {
    return handleTop250(pageStart, pageSize);
  }

  const target = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageSize}&page_start=${pageStart}`;

  try {
    const cacheTime = await getCacheTime();

    // 调用豆瓣 API
    const doubanData = await cached(target, cacheTime, () =>
      fetchDoubanData<DoubanApiResponse>(target)
    );

    // 转换数据格式
    const list: DoubanItem[] = doubanData.subjects.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.cover,
      rate: item.rate,
      year: '',
    }));

    const response: DoubanResult = {
      code: 200,
      message: '获取成功',
      list: list,
    };

    return NextResponse.json(response, {
      headers: cacheHeaders(cacheTime),
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取豆瓣数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function cacheHeaders(cacheTime: number) {
  return {
    'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    'Netlify-Vary': 'query',
  };
}

// 豆瓣 Top250 每页固定 25 条
const TOP250_PAGE_SIZE = 25;
const TOP250_TOTAL = 250;

async function handleTop250(pageStart: number, pageSize: number) {
  // 取覆盖 [pageStart, pageStart + pageSize) 的所有豆瓣页
  const firstStart =
    Math.floor(pageStart / TOP250_PAGE_SIZE) * TOP250_PAGE_SIZE;
  const end = Math.min(pageStart + pageSize, TOP250_TOTAL);
  const starts: number[] = [];
  for (let start = firstStart; start < end; start += TOP250_PAGE_SIZE) {
    starts.push(start);
  }

  try {
    const cacheTime = await getCacheTime();
    const pages = await Promise.all(
      starts.map((start) =>
        cached(`top250:${start}`, cacheTime, () => fetchTop250Page(start))
      )
    );
    const offset = pageStart - firstStart;
    const movies = pages.flat().slice(offset, offset + pageSize);

    const apiResponse: DoubanResult = {
      code: 200,
      message: '获取成功',
      list: movies,
      total: TOP250_TOTAL,
    };

    return NextResponse.json(apiResponse, {
      headers: cacheHeaders(cacheTime),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: '获取豆瓣 Top250 数据失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

async function fetchTop250Page(start: number): Promise<DoubanItem[]> {
  const target = `https://movie.douban.com/top250?start=${start}&filter=`;

  // 直接使用 fetch 获取 HTML 页面
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const fetchOptions: RequestInit = {
    signal: controller.signal,
    // 不使用 Next.js 的 Data Cache，缓存由 memory-cache 负责
    cache: 'no-store',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  };

  try {
    const fetchResponse = await fetch(target, fetchOptions);

    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
    }

    // 获取 HTML 内容
    const html = await fetchResponse.text();

    // 通过正则同时捕获影片 id、标题、封面以及评分
    const moviePattern =
      /<div class="item">[\s\S]*?<a[^>]+href="https?:\/\/movie\.douban\.com\/subject\/(\d+)\/"[\s\S]*?<img[^>]+alt="([^"]+)"[^>]*src="([^"]+)"[\s\S]*?<span class="rating_num"[^>]*>([^<]*)<\/span>[\s\S]*?<\/div>/g;
    const movies: DoubanItem[] = [];
    let match;

    while ((match = moviePattern.exec(html)) !== null) {
      const id = match[1];
      const title = match[2];
      const cover = match[3];
      const rate = match[4] || '';

      // 处理图片 URL，确保使用 HTTPS
      const processedCover = cover.replace(/^http:/, 'https:');

      movies.push({
        id: id,
        title: title,
        poster: processedCover,
        rate: rate,
        year: '',
      });
    }

    return movies;
  } finally {
    clearTimeout(timeoutId);
  }
}
