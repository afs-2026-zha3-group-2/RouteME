import { describe, expect, it } from 'vitest';
import { tripMessages } from '../i18n/tripMessages';
import {
  LEAVE_EVIDENCE_MAX_BYTES,
  canSubmitLeave,
  leaveNoteRequired,
  validateLeaveEvidence,
} from './leaveForm';

describe('leaveNoteRequired', () => {
  it('requires a note only for safety and force majeure', () => {
    expect(leaveNoteRequired(undefined)).toBe(false);
    expect(leaveNoteRequired('personal')).toBe(false);
    expect(leaveNoteRequired('force_majeure')).toBe(true);
    expect(leaveNoteRequired('safety')).toBe(true);
  });
});

describe('canSubmitLeave', () => {
  it('stays disabled until a reason is chosen', () => {
    expect(canSubmitLeave(undefined, '说明')).toBe(false);
  });

  it('allows personal reason without a note', () => {
    expect(canSubmitLeave('personal', '')).toBe(true);
    expect(canSubmitLeave('personal', '   ')).toBe(true);
  });

  it('requires a non-blank note for safety and force majeure', () => {
    expect(canSubmitLeave('safety', '')).toBe(false);
    expect(canSubmitLeave('safety', '   ')).toBe(false);
    expect(canSubmitLeave('safety', '有人跟踪我')).toBe(true);
    expect(canSubmitLeave('force_majeure', '台风停航')).toBe(true);
  });
});

describe('validateLeaveEvidence', () => {
  it('accepts jpeg / png / webp within 5MB', () => {
    expect(validateLeaveEvidence({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validateLeaveEvidence({ type: 'image/png', size: 1024 })).toBeNull();
    expect(validateLeaveEvidence({ type: 'image/webp', size: 1024 })).toBeNull();
    expect(validateLeaveEvidence({ type: 'image/jpeg', size: LEAVE_EVIDENCE_MAX_BYTES })).toBeNull();
  });

  it('rejects other types and oversized files', () => {
    expect(validateLeaveEvidence({ type: 'image/gif', size: 10 })).toBe(
      tripMessages.leaveEvidenceBadType,
    );
    expect(validateLeaveEvidence({ type: 'application/pdf', size: 10 })).toBe(
      tripMessages.leaveEvidenceBadType,
    );
    expect(validateLeaveEvidence({ type: 'image/png', size: LEAVE_EVIDENCE_MAX_BYTES + 1 })).toBe(
      tripMessages.leaveEvidenceTooLarge,
    );
  });
});
