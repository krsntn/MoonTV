'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import CapsuleSwitch from '@/components/CapsuleSwitch';

import { BackButton } from './BackButton';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const activePath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  return (
    <div className='w-full min-h-screen'>
      {/* 移动端头部 */}
      <MobileHeader showBackButton={activePath.startsWith('/play')} />

      {/* 主要布局容器 */}
      <div className='flex w-full min-h-screen md:min-h-auto'>
        {/* 主内容区域 */}
        <div className='relative min-w-0 flex-1 transition-all duration-300'>
          {/* 桌面端左上角返回按钮 */}
          {activePath.startsWith('/play') && (
            <div className='absolute top-3 left-1 z-20 hidden md:flex'>
              <BackButton />
            </div>
          )}

          {/* 桌面端顶部按钮 */}
          <div className='absolute top-2 right-4 z-20 hidden md:flex items-center gap-2'>
            <ThemeToggle />
            <UserMenu />
          </div>

          <div className='mt-2 justify-center items-center hidden md:flex'>
            <CapsuleSwitch
              options={[
                { label: '首页', value: 'home' },
                { label: '搜索', value: 'search', href: '/search' },
                { label: '电影', value: 'movie', href: '/douban' },
                { label: '剧集', value: 'tv', href: '/douban' },
                { label: '综艺', value: 'show', href: '/douban' },
                { label: '收藏夹', value: 'favorites' },
              ]}
              active={(() => {
                switch (pathname) {
                  case '/search':
                    return 'search';
                  default:
                    return searchParams.get('type') || 'home';
                }
              })()}
              onChange={(value, href) => {
                const newUrl = new URL(window.location.origin + (href || ''));
                if (!['home', 'search'].includes(value)) {
                  newUrl.searchParams.set('type', value);
                }
                router.push(newUrl.toString());
              }}
            />
          </div>

          {/* 主内容 */}
          <main
            className='flex-1 md:min-h-0 mb-14 md:mb-0'
            style={{
              paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className='md:hidden'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;
