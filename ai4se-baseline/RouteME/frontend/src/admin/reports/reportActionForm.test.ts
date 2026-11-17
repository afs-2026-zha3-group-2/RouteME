import { describe, expect, it } from 'vitest';
import {
  canSubmitReportResolution,
  emptyReportResolutionForm,
  toResolveRequest,
  validateReportResolution,
} from './reportActionForm';

const NOW = Date.parse('2026-11-16T09:00:00Z');
const FUTURE = '2026-11-20T09:00:00Z';

describe('reportActionForm', () => {
  it('requires an outcome and a note', () => {
    const state = emptyReportResolutionForm();
    expect(validateReportResolution(state, NOW)).toMatchObject({
      outcome: '请选择处理结果',
      note: '必填，500 字以内',
    });
  });

  it('requires an action when the report is upheld', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'RESOLVED';
    state.note = '已核实';
    expect(validateReportResolution(state, NOW)).toEqual({ action: '请选择处罚动作' });

    state.action = 'KEEP';
    expect(canSubmitReportResolution(state, NOW)).toBe(true);
  });

  it('requires ban fields for BAN and UPDATE_BAN', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'RESOLVED';
    state.note = '证据充分';
    state.action = 'BAN';
    expect(validateReportResolution(state, NOW)).toMatchObject({
      banReasonCode: '请选择封禁理由',
      banExpiresAt: '请选择解封时间',
    });

    state.banReasonCode = 'PRIVACY_LEAK';
    state.banExpiresAt = FUTURE;
    expect(canSubmitReportResolution(state, NOW)).toBe(true);
  });

  it('does not require ban fields for rejections', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'REJECTED';
    state.note = '证据不足';
    state.action = '';
    expect(canSubmitReportResolution(state, NOW)).toBe(true);
    expect(toResolveRequest(state)).toEqual({ outcome: 'REJECTED', note: '证据不足' });
  });

  it('maps a ban resolution to the contract request', () => {
    const state = emptyReportResolutionForm();
    state.outcome = 'RESOLVED';
    state.note = ' 多次骚扰 ';
    state.action = 'BAN';
    state.banReasonCode = 'HARASSMENT';
    state.banReasonNote = '已警告仍继续';
    state.banExpiresAt = FUTURE;
    expect(toResolveRequest(state)).toEqual({
      outcome: 'RESOLVED',
      note: '多次骚扰',
      action: 'BAN',
      ban_reason_code: 'HARASSMENT',
      ban_reason_note: '已警告仍继续',
      ban_expires_at: FUTURE,
    });
  });
});