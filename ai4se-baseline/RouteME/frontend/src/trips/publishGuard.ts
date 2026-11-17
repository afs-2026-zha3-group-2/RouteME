/**
 * 发布行程失败口径（A1 / proposal D6）：
 * 只有 `CREDIT_SCORE_BELOW_60` 才引导去安全学习，其余错误码继续走既有提示，
 * 首页 / 聊天 / 我的旅行不出现任何受限入口。
 */
export const CREDIT_GUARD_CODE = 'CREDIT_SCORE_BELOW_60';

export type PublishFailure =
  | { kind: 'creditGuard'; code: string }
  | { kind: 'generic'; code: string };

export function describePublishFailure(code: string | null): PublishFailure | null {
  if (code === null || code === '') {
    return null;
  }
  return code === CREDIT_GUARD_CODE ? { kind: 'creditGuard', code } : { kind: 'generic', code };
}
