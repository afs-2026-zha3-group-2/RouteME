import { useMyCredit } from './CreditContext';
import { tripMessages } from '../i18n/tripMessages';

/**
 * 低信用全局门禁：侧栏保留，内容区只显示大图标 + 受限说明 + 学习入口。
 * 学习页自身不套门禁（由 AppShell 按路由排除），避免把恢复入口也挡住。
 */
export function CreditRestrictionGate() {
  const { restricted, score } = useMyCredit();
  if (!restricted) {
    return null;
  }
  return (
    <section className="credit-gate" role="region" aria-label="信用受限">
      <div className="credit-gate-card">
        <span className="credit-gate-icon" aria-hidden="true">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M24 6 40 13v10.4c0 8.6-6.4 14.6-16 18-9.6-3.4-16-9.4-16-18V13z" />
            <path d="M24 16.5v9" />
            <circle cx="24" cy="31.5" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <p className="credit-gate-kicker">信用分低于 60</p>
        <h1 className="credit-gate-title">账号功能已暂停</h1>
        <p className="credit-gate-text">
          发布行程、申请同行、聊天与资料修改等写操作暂不可用。完成安全学习并答对 8 题，信用分恢复至
          60 后自动解除限制。
        </p>
        {score !== null && (
          <p className="credit-gate-score">
            当前信用分 <b>{score}</b> / 100
          </p>
        )}
        <a className="credit-gate-action" href="#/credit/learning">
          {tripMessages.publishGuardAction}
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7.5 4.5 13 10l-5.5 5.5" />
          </svg>
        </a>
        <p className="credit-gate-hint">
          每月 2 次考试、1 次恢复；未通过不占用恢复次数。
        </p>
      </div>
    </section>
  );
}
