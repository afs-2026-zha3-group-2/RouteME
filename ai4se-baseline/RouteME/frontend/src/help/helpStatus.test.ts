import { describe, expect, it } from 'vitest';
import { adminStatusLabel, reporterStatusLabel, statusTone } from './helpStatus';

describe('helpStatus', () => {
  it('keeps the four reporter labels distinct', () => {
    expect(reporterStatusLabel('PENDING')).toBe('待处理');
    expect(reporterStatusLabel('PROCESSING')).toBe('已受理，正在处理');
    expect(reporterStatusLabel('RESOLVED')).toBe('已处理');
    expect(reporterStatusLabel('REJECTED')).toBe('举报不成立');
  });

  it('labels the admin queue with the same four states', () => {
    expect(adminStatusLabel('PENDING')).toBe('待处理');
    expect(adminStatusLabel('PROCESSING')).toBe('处理中');
    expect(adminStatusLabel('RESOLVED')).toBe('已处理');
    expect(adminStatusLabel('REJECTED')).toBe('举报不成立');
  });

  it('maps every status to a badge tone', () => {
    expect(statusTone('PENDING')).toBe('amber');
    expect(statusTone('PROCESSING')).toBe('surf');
    expect(statusTone('RESOLVED')).toBe('jade');
    expect(statusTone('REJECTED')).toBe('muted');
  });
});