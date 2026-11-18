import { creditRestrictedActionMessage } from '../profile/creditDisplay';

/**
 * 受限账号的统一拦截提示；只做展示，服务端仍会返回 403 CREDIT_RESTRICTED。
 */
export function CreditRestrictedNotice() {
  return (
    <p className="blocked-notice" role="status">
      {creditRestrictedActionMessage()}
    </p>
  );
}
