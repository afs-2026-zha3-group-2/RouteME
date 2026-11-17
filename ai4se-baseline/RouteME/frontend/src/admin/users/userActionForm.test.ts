import { describe, expect, it } from 'vitest';
import {
  canSubmitUserAction,
  emptyUserActionForm,
  toStatusRequest,
  validateUserAction,
} from './userActionForm';

const NOW = Date.parse('2026-11-16T09:00:00Z');
const FUTURE = '2026-11-20T09:00:00Z';

describe('userActionForm', () => {
  it('requires a reason for suspend', () => {
    const state = emptyUserActionForm('SUSPEND');
    expect(validateUserAction(state, NOW)).toEqual({ reason: '请填写处理原因' });

    state.reason = '扰乱公共秩序';
    expect(canSubmitUserAction(state, NOW)).toBe(true);
  });

  it('requires ban reason, expiry and OTHER note', () => {
    const state = emptyUserActionForm('BAN');
    state.reason = '多次伪造行程';
    expect(validateUserAction(state, NOW)).toMatchObject({
      banReasonCode: '请选择封禁理由',
      banExpiresAt: '请选择解封时间',
    });

    state.banReasonCode = 'OTHER';
    state.banExpiresAt = FUTURE;
    expect(validateUserAction(state, NOW)).toEqual({
      banReasonNote: '选择「其他」时必须填写补充说明',
    });

    state.banReasonNote = '模仿他人账号';
    expect(canSubmitUserAction(state, NOW)).toBe(true);
  });

  it('rejects a ban expiry that is not in the future', () => {
    const state = emptyUserActionForm('BAN');
    state.reason = '严重骚扰';
    state.banReasonCode = 'HARASSMENT';
    state.banExpiresAt = '2026-11-16T09:00:00Z';
    expect(validateUserAction(state, NOW).banExpiresAt).toBe('解封时间必须晚于当前时间');
  });

  it('allows restoring without a reason', () => {
    const state = emptyUserActionForm('RESTORE');
    expect(canSubmitUserAction(state, NOW)).toBe(true);
    expect(toStatusRequest(state)).toEqual({ action: 'RESTORE', reason: null });
  });

  it('maps forms to contract requests and drops empty ban fields', () => {
    const state = emptyUserActionForm('BAN');
    state.reason = ' 虚假信息 ';
    state.banReasonCode = 'FAKE_TRIP';
    state.banExpiresAt = FUTURE;
    expect(toStatusRequest(state)).toEqual({
      action: 'BAN',
      reason: '虚假信息',
      ban_reason_code: 'FAKE_TRIP',
      ban_reason_note: null,
      ban_expires_at: FUTURE,
    });
  });
});