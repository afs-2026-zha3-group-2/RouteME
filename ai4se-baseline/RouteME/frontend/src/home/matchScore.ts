import type { DemoUser, TripSummary } from '../types';

/**
 * 首页推荐匹配度：纯前端启发式，不新增后端字段。
 * 以共同兴趣为主轴（每项 +9），常驻城市与目的地重合再加 8，
 * 行程 id 派生 0–5 的微扰避免同分卡片完全并列；上限 99，不出现「100% 完美」。
 */
export function matchScore(trip: TripSummary, user: DemoUser): number {
  const shared = trip.tags.filter((tag) => user.interests.includes(tag)).length;
  let score = 62 + shared * 9;
  const homeCity = (user.city ?? '').replace(/市$/u, '');
  if (homeCity !== '' && trip.destination.includes(homeCity)) {
    score += 8;
  }
  score += (trip.id * 7) % 6;
  return Math.min(99, score);
}