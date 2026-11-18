import { describe, expect, it } from 'vitest';
import { serviceChatHint } from './helpStatus';

describe('serviceChatHint', () => {
  it('keeps the four customer service hints distinct', () => {
    expect(serviceChatHint('WAITING')).toBe('等待客服接入');
    expect(serviceChatHint('HANDLING')).toBe('客服已接入');
    expect(serviceChatHint('RESOLVED')).toBe('客服已标记处理完成，如问题已解决请结束会话。');
    expect(serviceChatHint('CLOSED')).toBe('已结束');
  });
});
