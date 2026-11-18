import { Button, Tag } from 'antd';
import { financeMessages as m } from '../i18n/financeMessages';
import type { InsuranceSummary } from '../types';
import { insuranceStatusLabel } from './financeLabels';

type Props = {
  summary: InsuranceSummary;
  destination: string;
  startDate: string;
  endDate: string;
  companionCount: number;
  disabled: boolean;
  purchasing: boolean;
  confirming: boolean;
  onPurchase: () => void;
  onConfirm: () => void;
};

/** 第三方保险面板：行程上下文、状态、保障类别与保单 / 理赔 / 求助入口。 */
export function InsurancePanel({
  summary,
  destination,
  startDate,
  endDate,
  companionCount,
  disabled,
  purchasing,
  confirming,
  onPurchase,
  onConfirm,
}: Props) {
  const policy = summary.policy;
  const purchased = policy !== null;
  const statusColor = summary.status === 'active' ? 'green' : summary.status === 'expired' ? 'default' : 'orange';

  return (
    <section className="fin-section fin-insurance" aria-label={m.insuranceTitle}>
      <h3 className="panel-title">{m.insuranceTitle}</h3>

      <dl className="fin-facts fin-trip-facts">
        <div>
          <dt>{m.insuranceDestination}</dt>
          <dd>{destination}</dd>
        </div>
        <div>
          <dt>{m.insuranceDates}</dt>
          <dd>{m.insurancePeriod(startDate, endDate)}</dd>
        </div>
        <div>
          <dt>{m.insuranceCompanionCount}</dt>
          <dd>{m.insuranceCompanionValue(companionCount)}</dd>
        </div>
      </dl>

      <p className="fin-insurance-status" data-testid="insurance-status">
        {m.insuranceStatusLabel}：
        <Tag color={statusColor}>{insuranceStatusLabel(summary.status)}</Tag>
      </p>

      {purchased ? (
        <>
          <p className="fin-hint">
            {m.insurancePeriodLabel}：
            {m.insurancePeriod(policy.coverage_start, policy.coverage_end)}
          </p>
          {summary.status === 'expired' && <p className="fin-warning">{m.insuranceExpiredHint}</p>}
          <div className="fin-links">
            <a className="fin-link" href={summary.provider.policy_url} target="_blank" rel="noreferrer">
              {m.insuranceViewPolicy}
            </a>
            <a className="fin-link" href={summary.provider.claim_url} target="_blank" rel="noreferrer">
              {m.insuranceClaim}
            </a>
            <a className="fin-link" href={summary.provider.emergency_url} target="_blank" rel="noreferrer">
              {m.insuranceEmergency}
            </a>
          </div>
        </>
      ) : (
        <p className="fin-hint">{m.insuranceNotPurchasedHint}</p>
      )}

      <h4 className="fin-subtitle">{m.insuranceProductsTitle}</h4>
      <div className="fin-plan-grid">
        {summary.products.map((product) => (
          <article className="fin-plan" key={product.code}>
            <div className="fin-plan-head">
              <b>{product.title}</b>
            </div>
            <p className="fin-hint">{product.summary}</p>
          </article>
        ))}
      </div>
      <p className="fin-hint">{m.insuranceProductsHint}</p>

      <div className="fin-insurance-actions">
        <Button type="primary" disabled={disabled || summary.purchase_url === null} loading={purchasing} onClick={onPurchase}>
          {purchasing ? m.insuranceBuying : m.insuranceBuy}
        </Button>
        {!purchased && (
          <Button disabled={disabled} loading={confirming} onClick={onConfirm}>
            {confirming ? m.insuranceConfirming : m.insuranceConfirmDemo}
          </Button>
        )}
      </div>
      {!purchased && <p className="fin-hint">{m.insuranceDemoNote}</p>}

      <p className="fin-provider" data-testid="insurance-provider">
        {m.insuranceProviderLabel}：<b>{summary.provider.name}</b>
      </p>
      <p className="fin-hint">{m.insuranceProviderDisclaimer(summary.provider.name)}</p>
    </section>
  );
}