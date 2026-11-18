import type { DemoUser, StudentVerificationRequest } from '../types';
import { tripMessages } from '../i18n/tripMessages';

/** 与后端 StudentVerificationService 同值的边界：姓名 2–20、院校 2–60、验证码 12 位字母数字。 */
export const MIN_STUDENT_NAME_LENGTH = 2;
export const MAX_STUDENT_NAME_LENGTH = 20;
export const MIN_STUDENT_SCHOOL_LENGTH = 2;
export const MAX_STUDENT_SCHOOL_LENGTH = 60;
const VERIFICATION_CODE = /^[A-Za-z0-9]{12}$/;

export type StudentVerificationFormValues = {
  name: string;
  school: string;
  code: string;
};

export type StudentVerificationField = keyof StudentVerificationFormValues;

export type StudentVerificationFieldErrors = Partial<Record<StudentVerificationField, string>>;

export const emptyStudentVerificationForm: StudentVerificationFormValues = {
  name: '',
  school: '',
  code: '',
};

/**
 * 核心动作门槛：管理员豁免；其余账号必须已完成学信网学籍认证。
 * 与后端 StudentVerificationService.requireVerified 保持一致。
 */
export function canUseCoreActions(user: DemoUser): boolean {
  return user.student_verified || user.role === 'ADMIN';
}

export function validateStudentVerification(
  values: StudentVerificationFormValues,
): StudentVerificationFieldErrors {
  const errors: StudentVerificationFieldErrors = {};

  const name = values.name.trim();
  if (name === '') {
    errors.name = tripMessages.studentVerifyErrorNameRequired;
  } else if (name.length < MIN_STUDENT_NAME_LENGTH || name.length > MAX_STUDENT_NAME_LENGTH) {
    errors.name = tripMessages.studentVerifyErrorNameLength;
  }

  const school = values.school.trim();
  if (school === '') {
    errors.school = tripMessages.studentVerifyErrorSchoolRequired;
  } else if (
    school.length < MIN_STUDENT_SCHOOL_LENGTH ||
    school.length > MAX_STUDENT_SCHOOL_LENGTH
  ) {
    errors.school = tripMessages.studentVerifyErrorSchoolLength;
  }

  const code = values.code.trim();
  if (code === '') {
    errors.code = tripMessages.studentVerifyErrorCodeRequired;
  } else if (!VERIFICATION_CODE.test(code)) {
    errors.code = tripMessages.studentVerifyErrorCodeFormat;
  }

  return errors;
}

export function toStudentVerificationRequest(
  values: StudentVerificationFormValues,
): StudentVerificationRequest {
  return {
    name: values.name.trim(),
    school: values.school.trim(),
    code: values.code.trim().toUpperCase(),
  };
}

/** 后端字段原因码 → 表单文案；无法识别的原因为空串（由页面统一提示）。 */
export function fieldErrorFromReason(reason: string): string {
  if (reason === 'REQUIRED') {
    return tripMessages.studentVerifyErrorNameRequired;
  }
  if (reason === 'OUT_OF_RANGE' || reason === 'TOO_LONG') {
    return tripMessages.studentVerifyErrorNameLength;
  }
  return '';
}

/** 把 400 `INVALID_INPUT` 的 fields 映射到具体表单字段。 */
export function fieldErrorsFromReasons(
  fields: Record<string, string> | undefined,
): StudentVerificationFieldErrors {
  if (fields === undefined) {
    return {};
  }
  const errors: StudentVerificationFieldErrors = {};
  if (fields.name !== undefined) {
    errors.name = fieldErrorFromReason(fields.name);
  }
  if (fields.school !== undefined) {
    errors.school =
      fields.school === 'REQUIRED'
        ? tripMessages.studentVerifyErrorSchoolRequired
        : tripMessages.studentVerifyErrorSchoolLength;
  }
  if (fields.code !== undefined) {
    errors.code =
      fields.code === 'REQUIRED'
        ? tripMessages.studentVerifyErrorCodeRequired
        : tripMessages.studentVerifyErrorCodeFormat;
  }
  return errors;
}
