import { describe, expect, it } from 'vitest';
import {
  canSubmitReportResolution,
  emptyReportResolutionForm,
  toResolveRequest,
  validateReportResolution,
} from './reportActionForm';

describe('reportActionForm', () => {
  it('requires an outcome and a note', () => {
    const state = emptyReportResolutionForm();
    expect(validateReportResolution(state)).toMatchObject({
      outcome: '请选择处理结果',
      note: '必填，500 字以内',
    });
  });

  it('requires a violation type when the report is upheld', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'RESOLVED';
    state.note = '已核实';
    expect(validateReportResolution(state)).toEqual({ violationType: '请选择违规类型' });

    state.violationType = 'FAKE_TRIP';
    expect(canSubmitReportResolution(state)).toBe(true);
  });

  it('requires an other-deduction tier for OTHER and valid values only', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'RESOLVED';
    state.note = '证据充分';
    state.violationType = 'OTHER';
    expect(validateReportResolution(state)).toEqual({ otherDeduction: '请选择扣分档位' });

    state.otherDeduction = 15;
    expect(canSubmitReportResolution(state)).toBe(false);

    state.otherDeduction = 20;
    expect(canSubmitReportResolution(state)).toBe(true);
  });

  it('does not require violation fields for rejections', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'REJECTED';
    state.note = '证据不足';
    expect(canSubmitReportResolution(state)).toBe(true);
    expect(toResolveRequest(state)).toEqual({ outcome: 'REJECTED', note: '证据不足' });
  });

  it('rejects notes longer than 500 characters', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'REJECTED';
    state.note = 'x'.repeat(501);
    expect(validateReportResolution(state)).toEqual({ note: '处理备注（500 字以内）' });
  });

  it('maps a fixed-deduction resolution to the contract request', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'RESOLVED';
    state.note = ' 多次骚扰 ';
    state.violationType = 'HARASSMENT';
    expect(toResolveRequest(state)).toEqual({
      outcome: 'RESOLVED',
      note: '多次骚扰',
      violation_type: 'HARASSMENT',
      other_deduction: null,
    });
  });

  it('maps an OTHER resolution with its deduction tier', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'RESOLVED';
    state.note = ' 其他违规 ';
    state.violationType = 'OTHER';
    state.otherDeduction = 10;
    expect(toResolveRequest(state)).toEqual({
      outcome: 'RESOLVED',
      note: '其他违规',
      violation_type: 'OTHER',
      other_deduction: 10,
    });
  });
});
