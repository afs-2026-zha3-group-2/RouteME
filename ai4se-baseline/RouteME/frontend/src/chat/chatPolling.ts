/** 短轮询间隔：3 秒，满足「不超过 3 秒」的规格要求。 */
export const CHAT_POLL_INTERVAL_MS = 3000;

import type { TripStatus } from '../types';

/** 已结束或已取消行程只读，不再轮询。 */
export function shouldPoll(status: TripStatus | null | undefined): boolean {
  return status !== null && status !== undefined && status !== 'completed' && status !== 'cancelled';
}

/**
 * 启动短轮询，返回清理函数。
 *
 * <p>用函数而不是直接在组件里写 setInterval，便于用假定时器验证
 * 「3 秒一次」与「卸载后不再触发」。</p>
 */
export function startChatPolling(
  reload: () => void,
  intervalMs: number = CHAT_POLL_INTERVAL_MS,
): () => void {
  const timer: ReturnType<typeof setInterval> = setInterval(reload, intervalMs);
  return () => clearInterval(timer);
}
