'use client';

import { SORT_OPTIONS } from '@/lib/filters';
import { SortKey } from '@/lib/listing';

interface SortBarProps {
  sort: SortKey;
  // 豆瓣返回的条目总数，最多 500；null 表示未知
  total: number | null;
  onChange: (sort: SortKey) => void;
}

// 豆瓣最多返回 500 条，达到上限时显示 500+
const TOTAL_CAP = 500;

export default function SortBar({ sort, total, onChange }: SortBarProps) {
  return (
    <div className='flex items-center gap-3 overflow-x-auto'>
      <div className='flex shrink-0 rounded-lg bg-gray-800/60 p-1'>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors duration-200 sm:px-5 ${
              sort === option.key
                ? 'bg-gray-700 font-medium text-green-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {total !== null && (
        <span className='shrink-0 whitespace-nowrap text-sm text-gray-400'>
          共{' '}
          <span className='font-medium text-green-400'>
            {total >= TOTAL_CAP ? `${TOTAL_CAP}+` : total}
          </span>{' '}
          部
        </span>
      )}
    </div>
  );
}
