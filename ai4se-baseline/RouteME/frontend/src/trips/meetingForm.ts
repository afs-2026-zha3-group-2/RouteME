import { tripMessages } from '../i18n/tripMessages';
import type { TripMeetingRequest } from '../types';

export const MAX_MEETING_AREA_LENGTH = 100;
const MEETING_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export type MeetingFormValues = {
  meetingArea: string;
  meetingTime: string;
};

export type MeetingFieldErrors = Partial<Record<'meetingArea' | 'meetingTime', string>>;

export function emptyMeetingForm(): MeetingFormValues {
  return { meetingArea: '', meetingTime: '' };
}

export function meetingFormFrom(trip: {
  meeting_area: string | null;
  meeting_time: string | null;
}): MeetingFormValues {
  return {
    meetingArea: trip.meeting_area ?? '',
    meetingTime: trip.meeting_time ?? '',
  };
}

/** 与后端 TripMeetingRules 同口径；仅为体验校验，服务端仍是权威。 */
export function validateMeetingForm(values: MeetingFormValues, endDate: string): MeetingFieldErrors {
  const errors: MeetingFieldErrors = {};
  if (values.meetingArea.trim().length > MAX_MEETING_AREA_LENGTH) {
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

/** 两个字段整体替换：空值传 null 表示清空。 */
export function toMeetingRequest(values: MeetingFormValues): TripMeetingRequest {
  return {
    meeting_area: blankToNull(values.meetingArea),
    meeting_time: blankToNull(values.meetingTime),
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
