import { Button, Modal, Tag } from 'antd';
import { formatDateTime } from '../admin/adminFormat';
import { financeMessages as m } from '../i18n/financeMessages';
import type { TravelLoan } from '../types';
import { loanStatusLabel } from './financeLabels';
import { loanStatusOf, money } from './financeFormat';

type Props = {
  loans: TravelLoan[];
  tripTitles?: Record<number, string>;
  busyLoanId?: number | null;
  onRepay?: (loan: TravelLoan) => void;
};

const TONE: Record<string, string> = {
  active: 'blue',
  repaid: 'green',
  overdue: 'red',
};

/** 借款列表：本金 / 净额 / 应还 / 到期与状态，未结清时可手动还款。 */
export function LoanList({ loans, tripTitles, busyLoanId, onRepay }: Props) {
  if (loans.length === 0) {
    return <p className="fin-empty">{m.loansEmpty}</p>;
  }

  const confirmRepay = (loan: TravelLoan) => {
    if (onRepay === undefined) {
      return;
    }
    Modal.confirm({
      title: m.repayConfirmTitle,
      content: m.repayConfirmBody(money(loan.total_repay_cents)),
      okText: m.repay,
      cancelText: '取消',
      onOk: () => onRepay(loan),
    });
  };

  return (
    <ul className="fin-list">
      {loans.map((loan) => {
        const status = loanStatusOf(loan);
        return (
          <li className="fin-row" key={loan.id}>
            <div className="fin-row-main">
              <b>
                借款 {money(loan.principal_cents)}
                {tripTitles?.[loan.trip_id] !== undefined && ` · ${tripTitles[loan.trip_id]}`}
              </b>
              <span>
                {loan.term_days} {m.loanTermUnit}
              </span>
            </div>
            <div className="fin-row-side">
              <span className="fin-repay">
                <em>{m.loanRepayPreview}</em>
                <b>{money(loan.total_repay_cents)}</b>
              </span>
              <span>
                {m.loanNetPreview} {money(loan.disbursed_cents)} · {m.loanFeePreview}{' '}
                {money(loan.service_fee_cents)} · {m.loanInterest} {money(loan.interest_cents)}
                {loan.penalty_cents > 0 && ` · ${m.loanPenalty} ${money(loan.penalty_cents)}`}
              </span>
            </div>
            <div className="fin-row-meta">
              <span>
                发放 {formatDateTime(loan.funded_at)} · 到期 {formatDateTime(loan.due_at)}
                {loan.repaid_at !== null && ` · 还款 ${formatDateTime(loan.repaid_at)}`}
              </span>
              <span className="fin-row-actions">
                <Tag color={TONE[status]}>{loanStatusLabel(status)}</Tag>
                {status !== 'repaid' && onRepay !== undefined && (
                  <Button
                    size="small"
                    loading={busyLoanId === loan.id}
                    onClick={() => confirmRepay(loan)}
                  >
                    {busyLoanId === loan.id ? m.repaying : m.repay}
                  </Button>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}