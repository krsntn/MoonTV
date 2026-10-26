'use client';

export interface BangumiCalendarData {
  weekday: {
    en: string;
  };
  items: {
    id: number;
    name: string;
    name_cn: string;
    rating: {
      score: number;
    };
    air_date: string;
    // 部分条目没有图片，接口返回 null
    images: {
      large: string;
      common: string;
      medium: string;
      small: string;
      grid: string;
    } | null;
  }[];
}

export async function GetBangumiCalendarData(): Promise<BangumiCalendarData[]> {
  const response = await fetch('https://api.bgm.tv/calendar');
  const data = await response.json();
  return data;
}
