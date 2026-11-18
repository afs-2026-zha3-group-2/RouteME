import { adminMessages } from '../../i18n/adminMessages';
import type { AdminReportResolveRequest, ReportViolationType } from '../../types';

export type ReportResolutionFormState = {
  outcome: 'RESOLVED' | 'REJECTED' | '';
  note: string;
  violationType: ReportViolationType | '';
  otherDeduction: number | '';
};

export type ReportResolutionFormErrors = {
  outcome?: string;
  note?: string;
  violationType?: string;
  otherDeduction?: string;
};

const MAX_NOTE_LENGTH = 500;
const OTHER_DEDUCTIONS = [5, 10, 20, 30];

export function emptyReportResolutionForm(): ReportResolutionFormState {
  return {
    outcome: '',
    note: '',
    violationType: '',
    otherDeduction: '',
  };
}

/**
 * 举报处理表单校验：处理结果与说明必填；成立时必须选违规类型，
 * `OTHER` 再选 -5 / -10 / -20 / -30 档位。扣分值不在此处指定。
 */
export function validateReportResolution(
  state: ReportResolutionFormState,
): ReportResolutionFormErrors {
  const errors: ReportResolutionFormErrors = {};
  if (state.outcome === '') {
    errors.outcome = adminMessages.errorOutcomeRequired;
  }

  const note = state.note.trim();
  if (note === '') {
    errors.note =
      state.outcome === 'REJECTED'
        ? adminMessages.reportRejectionNote
        : adminMessages.reportResolutionNoteHint;
  } else if (note.length > MAX_NOTE_LENGTH) {
    errors.note = `${adminMessages.reportResolutionNote}（${MAX_NOTE_LENGTH} 字以内）`;
  }

  if (state.outcome === 'RESOLVED') {
    if (state.violationType === '') {
      errors.violationType = adminMessages.errorViolationRequired;
    } else if (
      state.violationType === 'OTHER' &&
      !OTHER_DEDUCTIONS.includes(Number(state.otherDeduction))
    ) {
      errors.otherDeduction = adminMessages.errorOtherDeductionRequired;
    }
  }
  return errors;
}

export function canSubmitReportResolution(state: ReportResolutionFormState): boolean {
  return Object.keys(validateReportResolution(state)).length === 0;
}

export function toResolveRequest(
  state: ReportResolutionFormState,
): AdminReportResolveRequest {
  const note = state.note.trim();
  if (state.outcome === 'REJECTED') {
    return { outcome: 'REJECTED', note };
  }
  return {
    outcome: 'RESOLVED',
    note,
    violation_type: state.violationType === '' ? null : state.violationType,
    other_deduction:
      state.violationType === 'OTHER' && state.otherDeduction !== ''
        ? Number(state.otherDeduction)
        : null,
  };
}
