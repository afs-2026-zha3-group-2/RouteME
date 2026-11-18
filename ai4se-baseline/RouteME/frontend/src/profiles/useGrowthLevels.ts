import { useEffect, useMemo, useState } from 'react';
import { loadUserGrowthLevels } from '../api';
import type { UserGrowthEntry } from '../types';

export type GrowthMap = Record<number, UserGrowthEntry>;

/**
 * 当前页的成长等级：对 id 集去重后只发一次请求，页面内复用结果。
 * 失败时静默降级（返回空表），不阻断页面其他内容。
 */
export function useGrowthLevels(ids: number[], callerId: number): GrowthMap {
  const key = useMemo(
    () =>
      Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)))
        .sort((left, right) => left - right)
        .join(','),
    [ids],
  );
  const [growth, setGrowth] = useState<GrowthMap>({});

  useEffect(() => {
    if (key === '') {
      setGrowth({});
      return;
    }
    let active = true;
    const wanted = key.split(',').map(Number);
    loadUserGrowthLevels(wanted, callerId)
      .then((entries) => {
        if (active) {
          setGrowth(Object.fromEntries(entries.map((entry) => [entry.user_id, entry])));
        }
      })
      .catch(() => {
        if (active) {
          setGrowth({});
        }
      });
    return () => {
      active = false;
    };
  }, [key, callerId]);

  return growth;
}
