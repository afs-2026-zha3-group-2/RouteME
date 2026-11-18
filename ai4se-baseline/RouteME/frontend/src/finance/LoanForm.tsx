import { useState } from 'react';
import { Button, InputNumber, Select, Typography } from 'antd';
import { financeMessages as m } from '../i18n/financeMessages';
import type { LoanCreateRequest, LoanTermDays, TravelLoan } from '../types';
import { feeOf, money, netOf } from './financeFormat';

const TERMS: LoanTermDays[] = [7, 14, 30];
const MIN_YUAN = 100;
const MAX_YUAN = 2_000;

type Props = {
  activeLoan: TravelLoan | null;
  disabled: boolean;
  submitting: boolean;
  onSubmit: (request: LoanCreateRequest) => void;
};

/** 借款表单：只提交本金（整元）与期限，净额 / 应还由 5% 规则实时预览。 */
export function LoanForm({ activeLoan, disabled, submitting, onSubmit }: Props) {
  const [principalYuan, setPrincipalYuan] = useState<number | null>(1_000);
  const [termDays, setTermDays] = useState<LoanTermDays>(14);
  const [invalid, setInvalid] = useState(false);

  if (activeLoan !== null) {
    return (
      <section className="fin-section" aria-label={m.loanTitle}>
        <h3 className="panel-title">{m.loanTitle}</h3>
        <p className="fin-warning">{m.loanActiveHint}</p>
        <Typography.Text type="secondary">
          {m.loanNetPreview} {money(activeLoan.disbursed_cents)} ·{' '}
          <span className="fin-repay">
            <em>{m.loanRepayPreview}</em>
            <b>{money(activeLoan.repay_cents)}</b>
          </span>
        </Typography.Text>
        <a className="fin-link" href="#/finance">
          {m.loanActiveLink}
        </a>
      </section>
    );
  }

  const principalCents = Math.round((principalYuan ?? 0) * 100);
  const fee = feeOf(principalCents);

  const submit = () => {
    if (
      principalYuan === null ||
      !Number.isInteger(principalYuan) ||
      principalYuan < MIN_YUAN ||
      principalYuan > MAX_YUAN
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSubmit({ principal_cents: principalCents, term_days: termDays });
  };

  return (
    <section className="fin-section" aria-label={m.loanTitle}>
      <h3 className="panel-title">{m.loanTitle}</h3>
      <div className="fin-form">
        <label className="fin-field">
          <span className="fin-label">
            {m.loanAmountLabel} <i>{m.loanAmountHint}</i>
          </span>
          <InputNumber
            min={MIN_YUAN}
            max={MAX_YUAN}
            step={1}
            precision={0}
            value={principalYuan}
            aria-label={m.loanAmountLabel}
            placeholder={m.loanAmountPlaceholder}
            status={invalid ? 'error' : undefined}
            onChange={(value) => {
              setPrincipalYuan(typeof value === 'number' ? value : null);
              setInvalid(false);
            }}
          />
        </label>
        <label className="fin-field">
          <span className="fin-label">{m.loanTermLabel}</span>
          <Select<LoanTermDays>
            value={termDays}
            aria-label={m.loanTermLabel}
            onChange={setTermDays}
            options={TERMS.map((days) => ({ value: days, label: `${days} ${m.loanTermUnit}` }))}
          />
        </label>
      </div>
      {invalid && <p className="fin-error">{m.loanInvalidAmount}</p>}
      <p className="fin-preview" data-testid="loan-preview">
        {m.loanNetPreview} <b>{money(netOf(principalCents))}</b> ·{' '}
        <span className="fin-repay">
          <em>{m.loanRepayPreview}</em>
          <b>{money(principalCents)}</b>
        </span>
        （{m.loanFeePreview} {money(fee)}，{m.loanNoInterest}）
      </p>
      <Button
        type="primary"
        block
        loading={submitting}
        disabled={disabled}
        onClick={submit}
      >
        {submitting ? m.loanSubmitting : m.loanSubmit}
      </Button>
      <p className="fin-hint">{m.loanHint}</p>
    </section>
  );
}