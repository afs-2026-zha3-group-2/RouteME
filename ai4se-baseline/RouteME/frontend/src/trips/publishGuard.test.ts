import { describe, expect, it } from 'vitest';
import { CREDIT_GUARD_CODE, describePublishFailure } from './publishGuard';

describe('describePublishFailure', () => {
  it('routes the credit guard code to the learning entry branch', () => {
    expect(describePublishFailure(CREDIT_GUARD_CODE)).toEqual({
      kind: 'creditGuard',
      code: 'CREDIT_SCORE_BELOW_60',
    });
  });

  it('keeps every other contract code on the generic branch', () => {
    const generic = ['INVALID_INPUT', 'CAPACITY_OUT_OF_RANGE', 'USER_NOT_FOUND', 'UNKNOWN_ERROR'];
    for (const code of generic) {
      expect(describePublishFailure(code)).toEqual({ kind: 'generic', code });
    }
  });

  it('does not treat a near-miss code as the guard', () => {
    expect(describePublishFailure('CREDIT_SCORE_BELOW_60 ')).toEqual({
      kind: 'generic',
      code: 'CREDIT_SCORE_BELOW_60 ',
    });
    expect(describePublishFailure('credit_score_below_60')).toEqual({
      kind: 'generic',
      code: 'credit_score_below_60',
    });
    expect(describePublishFailure('CREDIT_SCORE_BELOW_50')).toEqual({
      kind: 'generic',
      code: 'CREDIT_SCORE_BELOW_50',
    });
  });

  it('stays silent when there is no failure', () => {
    expect(describePublishFailure(null)).toBeNull();
    expect(describePublishFailure('')).toBeNull();
  });
});
