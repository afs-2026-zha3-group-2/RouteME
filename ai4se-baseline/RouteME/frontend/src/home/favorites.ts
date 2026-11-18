import { useCallback, useState } from 'react';

/**
 * 行程收藏：本机持久化（localStorage），按账号隔离。
 * 后端暂无收藏契约，收藏只影响本机「只看收藏」筛选，不伪造服务端状态。
 */
const KEY_PREFIX = 'routeme:favorites:';

function readIds(userId: number): number[] {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + userId);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

function writeIds(userId: number, ids: number[]): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(ids));
  } catch {
    // 隐私模式等写入失败时收藏仍保留在本次会话内存里。
  }
}

export function useFavorites(userId: number) {
  const [ids, setIds] = useState<number[]>(() => readIds(userId));

  const has = useCallback((tripId: number) => ids.includes(tripId), [ids]);

  const toggle = useCallback(
    (tripId: number) => {
      setIds((previous) => {
        const next = previous.includes(tripId)
          ? previous.filter((id) => id !== tripId)
          : [...previous, tripId];
        writeIds(userId, next);
        return next;
      });
    },
    [userId],
  );

  return { ids, has, toggle };
}