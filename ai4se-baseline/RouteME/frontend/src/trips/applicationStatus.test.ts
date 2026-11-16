import { describe, expect, it } from 'vitest';
import { applicationLabel } from './applicationStatus';

describe('applicationLabel', () => {
  it('labels every contract status', () => {
    expect(applicationLabel('pending')).toBe('申请待处理');
    expect(applicationLabel('accepted')).toBe('已匹配同行');
    expect(applicationLabel('rejected')).toBe('申请被拒绝');
    expect(applicationLabel('cancelled')).toBe('申请已取消');
    expect(applicationLabel('left')).toBe('已退出');
  });
});
