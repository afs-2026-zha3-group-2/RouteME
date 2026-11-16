const DAY_MS = 24 * 60 * 60 * 1000;

type InterestOwner = {
  id: number;
  interests: string[];
};

/**
 * 共同兴趣：按当前用户兴趣顺序返回交集；自我查看或没有交集时返回空数组。
 */
export function sharedInterests(current: InterestOwner, other: InterestOwner): string[] {
  if (current.id === other.id) {
    return [];
  }
  return current.interests.filter((interest) => other.interests.includes(interest));
}

function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}

/**
 * 加入时间：按自然日差展示相对时间；无法解析时回退原始值。
 */
export function formatJoinedAt(iso: string, now: Date): string {
  const joined = new Date(iso);
  if (Number.isNaN(joined.getTime()) || Number.isNaN(now.getTime())) {
    return iso;
  }
  const days = utcDayNumber(now) - utcDayNumber(joined);
  if (days <= 0) {
    return '今天';
  }
  if (days === 1) {
    return '昨天';
  }
  if (days < 30) {
    return `${days} 天前`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} 个月前`;
  }
  return `${Math.floor(days / 365)} 年前`;
}
