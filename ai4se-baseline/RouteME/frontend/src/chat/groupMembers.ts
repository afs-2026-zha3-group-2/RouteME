import type { DemoUser } from '../types';

export type GroupMember = {
  user: DemoUser;
  role: 'publisher' | 'companion';
};

/**
 * 群成员名单：发布者置顶，其后是当前已接受同行者（行程详情的 participants）。
 * 按 id 去重，保持后端成员口径（发布者 + ACCEPTED）；不改动入参数组。
 */
export function buildGroupMembers(publisher: DemoUser, participants: DemoUser[]): GroupMember[] {
  const members: GroupMember[] = [{ user: publisher, role: 'publisher' }];
  const seen = new Set<number>([publisher.id]);
  for (const user of participants) {
    if (seen.has(user.id)) {
      continue;
    }
    seen.add(user.id);
    members.push({ user, role: 'companion' });
  }
  return members;
}