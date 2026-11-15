import type { CSSProperties } from 'react';
import type { DemoUser } from '../types';

const HUES = [186, 22, 268, 152, 206, 44];

type Props = {
  user: DemoUser;
  size?: 'sm' | 'lg' | 'xl';
};

/**
 * 首字母头像：色相由用户 id 派生，避免为演示数据引入图片资源。
 */
export function Avatar({ user, size }: Props) {
  const hue = HUES[Math.abs(user.id) % HUES.length];
  const className = size === undefined ? 'avatar' : `avatar ${size}`;

  return (
    <span
      className={className}
      style={{ '--hue': String(hue) } as CSSProperties}
      aria-hidden="true"
    >
      {user.avatar_initial}
    </span>
  );
}