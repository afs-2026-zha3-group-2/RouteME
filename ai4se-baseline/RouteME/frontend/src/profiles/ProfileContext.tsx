import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DemoUser } from '../types';
import { ProfileModal } from './ProfileModal';

type ProfileContextValue = {
  openProfile: (userId: number) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (value === null) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }
  return value;
}

type Props = {
  currentUser: DemoUser;
  children: ReactNode;
};

/**
 * 全应用共用一个资料弹窗：任意入口只需调用 openProfile，不用各自持有弹窗状态。
 */
export function ProfileProvider({ currentUser, children }: Props) {
  const [openUserId, setOpenUserId] = useState<number | null>(null);
  const openProfile = useCallback((userId: number) => setOpenUserId(userId), []);
  const value = useMemo(() => ({ openProfile }), [openProfile]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
      <ProfileModal
        currentUser={currentUser}
        userId={openUserId}
        onClose={() => setOpenUserId(null)}
      />
    </ProfileContext.Provider>
  );
}
