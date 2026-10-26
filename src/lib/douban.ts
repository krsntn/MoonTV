/**
 * 通用的豆瓣数据获取函数
 * @param url 请求的URL
 * @returns Promise<T> 返回指定类型的数据
 */
export async function fetchDoubanData<T>(url: string): Promise<T> {
  // 添加超时控制
  const controller = new AbortController();
  // 正常响应在 4 秒内；豆瓣限流时不返回任何响应，7 秒后放弃，让浏览器尽快改走 CDN 镜像
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  // 设置请求选项，包括信号和头部
  const fetchOptions: RequestInit = {
    signal: controller.signal,
    // 不使用 Next.js 的 Data Cache（Node 运行时会默认缓存一年），缓存由 memory-cache 负责
    cache: 'no-store',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://movie.douban.com',
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
