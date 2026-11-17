import { formatChatTime } from './chatTime';

/** 集合信息为空时的展示文案，与原型一致。 */
export const MEETING_PENDING = '待确认';

export function meetingAreaText(value: string[] | null | undefined): string {
  const areas = (value ?? []).map((area) => area.trim()).filter((area) => area !== '');
  return areas.length > 0 ? areas.join('、') : MEETING_PENDING;
}

export function meetingTimeText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? formatChatTime(trimmed) : MEETING_PENDING;
}

/** 聊天页安全条文案（原型 `chat-safety`）：集合区域与集合时间必须出现。 */
export function chatSafetyText(
  meetingAreas: string[] | null | undefined,
  meetingTime: string | null | undefined,
): string {
  return `首次见面请选择公共场所 · 集合区域：${meetingAreaText(meetingAreas)} · 集合时间：${meetingTimeText(meetingTime)} · 不要转账或提供证件信息`;
}

/** 「我的旅行·已匹配」底部的集合备注。 */
export function mineMeetingNote(
  meetingAreas: string[] | null | undefined,
  meetingTime: string | null | undefined,
  joinedCount: number,
): string {
  return `集合：${meetingAreaText(meetingAreas)} · ${meetingTimeText(meetingTime)} · 同行 ${joinedCount} 人`;
}