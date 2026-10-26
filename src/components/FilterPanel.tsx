'use client';

import { FilterRow } from '@/lib/filters';

interface FilterPanelProps {
  rows: FilterRow[];
  // 每行当前选中的值，'all' 表示行首的“全部”
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const CHIP_CLASS =
  'shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-sm transition-colors duration-200';

function chipClass(selected: boolean): string {
  return `${CHIP_CLASS} ${
    selected
      ? 'bg-green-500 font-medium text-white'
      : 'text-gray-300 hover:text-green-400'
  }`;
}

// 筛选面板：每行一个维度，全部行始终可见；桌面端选项换行，移动端单行横向滚动
export default function FilterPanel({
  rows,
  values,
  onChange,
}: FilterPanelProps) {
  return (
    <div className='space-y-1.5 rounded-2xl border border-gray-700/40 bg-gray-800/40 p-3 sm:space-y-2 sm:p-5'>
      {rows.map((row) => {
        const selected = values[row.key] ?? 'all';
        return (
          <div key={row.key} className='flex items-start gap-2 sm:gap-3'>
            {/* 行首：有“全部”选项时它同时作为行标题 */}
            <div className='w-20 shrink-0 sm:w-24'>
              {row.allLabel ? (
                <button
                  onClick={() => onChange(row.key, 'all')}
                  className={chipClass(selected === 'all')}
                >
                  {row.allLabel}
                </button>
              ) : (
                <span className='inline-block px-2.5 py-1 text-sm text-gray-500'>
                  {row.label}
                </span>
              )}
            </div>
            <div className='flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto sm:flex-wrap sm:gap-x-2 sm:gap-y-1.5 sm:overflow-visible'>
              {row.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onChange(row.key, option.value)}
                  className={chipClass(selected === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
