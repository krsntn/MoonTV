/* eslint-disable @typescript-eslint/no-explicit-any,no-console */
import { getCacheTime, getConfig } from '@/lib/config';
import { searchFromApiStream } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // 立即开始流式处理
  (async () => {
    try {
      // 1. 立即发送一个空行，强制 Vercel 冲刷响应头，让客户端立即看到 200 OK
      await writer.write(encoder.encode('\n'));

      if (!query) {
        await writer.write(encoder.encode(JSON.stringify({ results: [] }) + '\n'));
        await writer.close();
        return;
      }

      // 2. 获取配置，合并任务
      const config = await getConfig();
      const apiSites = config.SourceConfig.filter((site) => !site.disabled);

      // 安全写入与断连处理
      let shouldStop = false;
      const abortSignal = (request as any).signal as AbortSignal | undefined;
      abortSignal?.addEventListener('abort', () => {
        shouldStop = true;
        try {
          writer.close();
        } catch {
          // ignore
        }
      });

      const safeWrite = async (obj: unknown) => {
        if (shouldStop || abortSignal?.aborted) return false;
        try {
          await writer.write(encoder.encode(JSON.stringify(obj) + '\n'));
          return true;
        } catch {
          shouldStop = true;
          return false;
        }
      };

      // -------------------------
      // 流式并发搜索
      // -------------------------
      const aggregatedResults: any[] = [];
      const failedSources: { name: string; key: string; error: string }[] = [];

      const tasks = apiSites.map(async (site) => {
        const startTime = Date.now();
        try {
          const generator = searchFromApiStream(site, query);
          let hasResults = false;
          let pageCount = 0;

          for await (const pageResults of generator) {
            pageCount++;
            let filteredResults = pageResults;
            if (filteredResults.length !== 0) {
              hasResults = true;
            }
            if (!config.SiteConfig.DisableYellowFilter) {
              filteredResults = pageResults.filter((result) => {
                const typeName = result.type_name || '';
                return !yellowWords.some((word) => typeName.includes(word));
              });
            }

            if (hasResults && filteredResults.length === 0) {
              failedSources.push({
                name: site.name,
                key: site.key,
                error: '结果被过滤',
              });
              await safeWrite({ failedSources });
              return;
            }

            aggregatedResults.push(...filteredResults);
            if (
              !(await safeWrite({ site: site.key, pageResults: filteredResults }))
            ) {
              return;
            }
          }

          if (!hasResults) {
            failedSources.push({
              name: site.name,
              key: site.key,
              error: '无搜索结果',
            });
            await safeWrite({ failedSources });
          }
        } catch (err: any) {
          console.warn(`[Search] ${site.name} failed:`, err.message);
          failedSources.push({
            name: site.name,
            key: site.key,
            error: err.message || '未知的错误',
          });
          await safeWrite({ failedSources });
        }
      });

      // 等所有 site 跑完
      await Promise.allSettled(tasks);

      // 最后发送汇总信息（可选，用于某些客户端兼容）
      if (failedSources.length > 0) {
        await safeWrite({ failedSources });
      }
      await safeWrite({ aggregatedResults });

      try {
        await writer.close();
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('[Search API Error]', err);
      try {
        await writer.close();
      } catch {
        // ignore
      }
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
