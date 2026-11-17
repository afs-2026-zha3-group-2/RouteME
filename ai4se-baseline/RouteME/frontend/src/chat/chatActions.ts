import type { DemoUser, TripStatus } from '../types';

export type ChatHeaderContext = {
  currentUserId: number;
  isPublisher: boolean;
  tripStatus: TripStatus;
  participants: DemoUser[];
};

/**
 * 「退出同行」只在当前用户仍是该行程已接受同行者、且行程未结束时显示。
 *
 * <p>`participants` 只含发布者与已接受同行者，因此已退出（left）用户
 * 不在其中，按钮自动隐藏，不需要额外的申请状态字段。</p>
 */
export function canLeaveTrip(context: ChatHeaderContext): boolean {
  if (
    context.isPublisher ||
    context.tripStatus === 'completed' ||
    context.tripStatus === 'cancelled'
  ) {
    return false;
  }
  return context.participants.some((user) => user.id === context.currentUserId);
}
