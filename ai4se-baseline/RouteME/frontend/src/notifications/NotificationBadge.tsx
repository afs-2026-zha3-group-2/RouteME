import { badgeLabel } from './notificationModel';

type Props = {
  /** 徽标数字；0 时不渲染。 */
  count: number;
  /** 供 E2E 定位的测试 id（`notification-badge` / `rail-chat-badge` 等）。 */
  testId: string;
  className?: string;
};

/**
 * 未读数字徽标：文本就是数字，颜色只是强调，不承担唯一信息。
 * 外层入口负责把同一数字写进 `aria-label`，因此徽标本身对读屏隐藏。
 */
export function NotificationBadge({ count, testId, className }: Props) {
  const label = badgeLabel(count);
  if (label === '') {
    return null;
  }
  return (
    <span
      className={className === undefined ? 'count-badge' : `count-badge ${className}`}
      data-testid={testId}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}