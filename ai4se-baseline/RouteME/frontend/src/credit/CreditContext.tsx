import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadUserCredits } from '../api';
import type { DemoUser } from '../types';

type MyCreditValue = {
  restricted: boolean;
  score: number | null;
  refresh: () => void;
};

const MyCreditContext = createContext<MyCreditValue | null>(null);

export function useMyCredit(): MyCreditValue {
  const value = useContext(MyCreditContext);
  if (value === null) {
    throw new Error('useMyCredit must be used inside CreditProvider');
  }
  return value;
}

type Props = {
  currentUser: DemoUser;
  children: ReactNode;
};

/**
 * 当前用户的信用限制状态：登录后取一次，动作完成后调用 refresh。
 * 只用于前端禁用 / 提示；服务端仍是安全边界。
 */
export function CreditProvider({ currentUser, children }: Props) {
  const [restricted, setRestricted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const refresh = useCallback(() => {
    loadUserCredits([currentUser.id], currentUser.id)
      .then((entries) => {
        const mine = entries.find((entry) => entry.user_id === currentUser.id);
        if (mine !== undefined) {
          setRestricted(mine.credit_restricted);
          setScore(mine.credit_score);
        }
      })
      .catch(() => undefined);
  }, [currentUser.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ restricted, score, refresh }),
    [restricted, score, refresh],
  );

  return <MyCreditContext.Provider value={value}>{children}</MyCreditContext.Provider>;
}
