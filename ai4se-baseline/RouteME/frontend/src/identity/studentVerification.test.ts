import { describe, expect, it } from 'vitest';
import {
  canUseCoreActions,
  emptyStudentVerificationForm,
  fieldErrorsFromReasons,
  toStudentVerificationRequest,
  validateStudentVerification,
  type StudentVerificationFormValues,
} from './studentVerification';
import type { DemoUser } from '../types';

const valid: StudentVerificationFormValues = {
  name: '张三',
  school: '中山大学',
  code: 'AB12CD34EF56',
};

function user(patch: Partial<DemoUser>): DemoUser {
  return {
    id: 1,
    nickname: '林见夏',
    avatar_initial: '林',
    bio: '',
    interests: [],
    profile_complete: true,
    student_verified: true,
    ...patch,
  };
}

describe('validateStudentVerification', () => {
  it('accepts a complete verification form', () => {
    expect(validateStudentVerification(valid)).toEqual({});
  });

  it('requires every field', () => {
    const errors = validateStudentVerification(emptyStudentVerificationForm);
    expect(errors.name).toBeDefined();
    expect(errors.school).toBeDefined();
    expect(errors.code).toBeDefined();
  });

  it('rejects an out-of-range name and school', () => {
    const errors = validateStudentVerification({ ...valid, name: '张', school: '中'.repeat(61) });
    expect(errors.name).toBeDefined();
    expect(errors.school).toBeDefined();
  });

  it('requires a 12-character alphanumeric code', () => {
    expect(validateStudentVerification({ ...valid, code: '12345' }).code).toBeDefined();
    expect(validateStudentVerification({ ...valid, code: 'AB12-CD34-EF56' }).code).toBeDefined();
    expect(validateStudentVerification({ ...valid, code: 'ab12cd34ef56' }).code).toBeUndefined();
  });
});

describe('toStudentVerificationRequest', () => {
  it('trims text fields and upper-cases the code', () => {
    expect(
      toStudentVerificationRequest({ name: ' 张三 ', school: ' 中山大学 ', code: ' ab12cd34ef56 ' }),
    ).toEqual({ name: '张三', school: '中山大学', code: 'AB12CD34EF56' });
  });
});

describe('fieldErrorsFromReasons', () => {
  it('maps backend reason codes to field messages', () => {
    const errors = fieldErrorsFromReasons({
      name: 'REQUIRED',
      school: 'TOO_LONG',
      code: 'INVALID_OPTION',
    });
    expect(errors.name).toBeDefined();
    expect(errors.school).toBeDefined();
    expect(errors.code).toBeDefined();
  });

  it('returns no errors when fields are absent', () => {
    expect(fieldErrorsFromReasons(undefined)).toEqual({});
  });
});

describe('canUseCoreActions', () => {
  it('allows verified students and administrators', () => {
    expect(canUseCoreActions(user({ student_verified: true }))).toBe(true);
    expect(canUseCoreActions(user({ student_verified: false, role: 'ADMIN' }))).toBe(true);
  });

  it('blocks unverified regular accounts', () => {
    expect(canUseCoreActions(user({ student_verified: false, role: 'USER' }))).toBe(false);
  });
});
