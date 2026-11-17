import { useEffect, useMemo, useState } from 'react';
import { loadUserCredits } from '../api';
import type { UserCreditEntry } from '../types';

export type CreditMap = Record<number, UserCreditEntry>;

/**
 * 当前页的信用状态：对 id 集去重后只发一次请求，页面内复用结果。
 * 失败时静默降级（返回空表），不阻断页面其他内容。
 */
export function useUserCredits(ids: number[], callerId: number): CreditMap {
  const key = useMemo(
    () =>
      Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)))
        .sort((left, right) => left - right)
        .join(','),
    [ids],
  );
  const [credits, setCredits] = useState<CreditMap>({});

  useEffect(() => {
    if (key === '') {
      setCredits({});
      return;
    }
    let active = true;
    const wanted = key.split(',').map(Number);
    loadUserCredits(wanted, callerId)
      .then((entries) => {
        if (active) {
          setCredits(Object.fromEntries(entries.map((entry) => [entry.user_id, entry])));
        }
      })
      .catch(() => {
        if (active) {
          setCredits({});
        }
      });
    return () => {
      active = false;
    };
  }, [key, callerId]);

  return credits;
}
