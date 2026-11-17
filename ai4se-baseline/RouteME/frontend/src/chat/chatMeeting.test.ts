import { describe, expect, it } from 'vitest';
import { chatSafetyText, meetingAreaText, meetingTimeText, mineMeetingNote } from './chatMeeting';

describe('meetingAreaText / meetingTimeText', () => {
  it('falls back to 待确认 for missing values', () => {
    expect(meetingAreaText(null)).toBe('待确认');
    expect(meetingAreaText([])).toBe('待确认');
    expect(meetingAreaText(['  '])).toBe('待确认');
    expect(meetingAreaText(['陈家祠', '永庆坊'])).toBe('陈家祠、永庆坊');
    expect(meetingTimeText(undefined)).toBe('待确认');
  });

  it('formats a meeting time like a message timestamp', () => {
    expect(meetingTimeText('2026-11-20T08:30')).toMatch(/^\d{1,2}\/\d{1,2} 08:30$|^今天 08:30$|^昨天 08:30$/);
  });
});

describe('chatSafetyText', () => {
  it('contains the three required parts', () => {
    const text = chatSafetyText(['陈家祠地铁站 D 口'], null);
    expect(text).toContain('首次见面请选择公共场所');
    expect(text).toContain('集合区域：陈家祠地铁站 D 口');
    expect(text).toContain('集合时间：待确认');
    expect(text).toContain('不要转账或提供证件信息');
  });
});

describe('mineMeetingNote', () => {
  it('joins area, time and companion count', () => {
    expect(mineMeetingNote(['陈家祠地铁站 D 口'], null, 3)).toBe('集合：陈家祠地铁站 D 口 · 待确认 · 同行 3 人');
    expect(mineMeetingNote(['a', 'b'], null, 2)).toBe('集合：a、b · 待确认 · 同行 2 人');
  });
});
