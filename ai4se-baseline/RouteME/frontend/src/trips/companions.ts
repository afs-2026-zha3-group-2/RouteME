import type { DemoUser } from '../types';

/**
 * 详情页「当前同行者」口径：接口返回「发布者 + 已接受同行者」，
 * 发布者在上方资料卡单独展示，这里过滤掉并按 id 去重（保留首次出现），顺序沿用响应顺序。
 */
export function tripCompanions(participants: DemoUser[], publisherId: number): DemoUser[] {
  const seen = new Set<number>();
  const companions: DemoUser[] = [];
  for (const participant of participants) {
    if (participant.id === publisherId || seen.has(participant.id)) {
      continue;
    }
    seen.add(participant.id);
    companions.push(participant);
  }
  return companions;
}
