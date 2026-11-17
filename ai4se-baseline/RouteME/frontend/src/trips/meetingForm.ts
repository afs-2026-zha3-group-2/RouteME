import { tripMessages } from '../i18n/tripMessages';
import type { TripMeetingRequest } from '../types';
import { MAX_MEETING_AREAS } from './tripOptions';

export const MAX_MEETING_AREA_LENGTH = 100;
const MEETING_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export type MeetingFormValues = {
  meetingAreas: string[];
  meetingTime: string;
};

export type MeetingFieldErrors = Partial<Record<'meetingArea' | 'meetingTime', string>>;

export function emptyMeetingForm(): MeetingFormValues {
  return { meetingAreas: [], meetingTime: '' };
}

export function meetingFormFrom(trip: {
  meeting_areas: string[] | null;
  meeting_time: string | null;
}): MeetingFormValues {
  return {
    meetingAreas: trip.meeting_areas ?? [],
    meetingTime: trip.meeting_time ?? '',
  };
}

/**
 * Whether the meeting info still needs filling in. Both fields are optional so a payload
 * from an older backend (no meeting_areas / meeting_time) reads as "empty" instead of
 * throwing on `.length`.
 */
export function isMeetingIncomplete(trip: {
  meeting_areas?: string[] | null;
  meeting_time?: string | null;
}): boolean {
  return (trip.meeting_areas ?? []).length === 0 || (trip.meeting_time ?? null) === null;
}

/** 与后端 TripPlan.cleanMeetingAreas 同口径；仅为体验校验，服务端仍是权威。 */
export function validateMeetingForm(values: MeetingFormValues, endDate: string): MeetingFieldErrors {
  const errors: MeetingFieldErrors = {};
  if (values.meetingAreas.length > MAX_MEETING_AREAS) {
    errors.meetingArea = tripMessages.errorMeetingAreasLimit;
  } else if (values.meetingAreas.some((area) => area.trim().length > MAX_MEETING_AREA_LENGTH)) {
    errors.meetingArea = tripMessages.errorMeetingAreaTooLong;
  }
  const time = values.meetingTime.trim();
  if (time !== '') {
    if (!MEETING_TIME_PATTERN.test(time)) {
      errors.meetingTime = tripMessages.errorMeetingTimeFormat;
    } else if (endDate !== '' && time.slice(0, 10) > endDate) {
      errors.meetingTime = tripMessages.errorMeetingTimeAfterEnd;
    }
  }
  return errors;
}

/**
 * 集合地点只保留一个：手输的地点 trim 后直接替换已选地点；
 * 与已选地点完全相同时提示重复，不重复写入。
 */
export function addMeetingArea(
  areas: string[],
  raw: string,
): { next: string[]; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { next: areas, error: null };
  }
  if (trimmed.length > MAX_MEETING_AREA_LENGTH) {
    return { next: areas, error: tripMessages.errorMeetingAreaTooLong };
  }
  if (areas.length === 1 && areas[0] === trimmed) {
    return { next: areas, error: '这个集合地点已经添加过了' };
  }
  return { next: [trimmed], error: null };
}

/** 两个字段整体替换：空值传 null 表示清空。 */
export function toMeetingRequest(values: MeetingFormValues): TripMeetingRequest {
  return {
    meeting_areas: values.meetingAreas.length > 0 ? values.meetingAreas : null,
    meeting_time: blankToNull(values.meetingTime),
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}