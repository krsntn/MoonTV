import { ImagePlaceholder } from '@/components/ImagePlaceholder';

const DoubanCardSkeleton = () => {
  return (
    <div className='w-full'>
      <div className='group relative w-full rounded-lg bg-transparent shadow-none flex flex-col'>
        {/* 图片占位符 - 骨架屏效果 */}
        <ImagePlaceholder aspectRatio='aspect-[2/3]' />

        {/* 标题骨架：与 VideoCard 的标题行（mt-2 + text-sm 一行）占同样的高度，
            加载完成后卡片行不变高，浏览器恢复的滚动位置不会偏移 */}
        <div className='mt-2 flex h-5 items-center justify-center'>
          <div className='h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse'></div>
        </div>
      </div>
    </div>
  );
};

export default DoubanCardSkeleton;
