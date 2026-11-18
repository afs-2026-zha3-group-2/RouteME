import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton, Tag, message } from 'antd';
import {
  confirmInsurance,
  createLoan,
  loadTripFinance,
  openInsurancePurchase,
  repayLoan,
} from '../api';
import { financeMessages as m } from '../i18n/financeMessages';
import type { DemoUser, LoanCreateRequest, TravelLoan, TripFinance } from '../types';
import { ineligibleMessage } from './financeEligibility';
import { financeErrorText, financeTripStatusLabel } from './financeLabels';
import { InsurancePanel } from './InsurancePanel';
import { LoanForm } from './LoanForm';
import { LoanList } from './LoanList';
import { WalletCard } from './WalletCard';

type Props = {
  currentUser: DemoUser;
  tripId: number;
};

function errorCode(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
}

/** 行程维度保障页：行程上下文、第三方保险入口与借款。 */
export function TripFinancePage({ currentUser, tripId }: Props) {
  const [finance, setFinance] = useState<TripFinance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [repayingLoanId, setRepayingLoanId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    loadTripFinance(currentUser.id, tripId)
      .then((loaded) => {
        if (active) {
          setFinance(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setLoadError(errorCode(caught));
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id, tripId, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  if (loadError !== null) {
    return (
      <main className="form-page">
        <Alert
          type="error"
          showIcon
          title={m.loadFailed}
          description={financeErrorText(loadError)}
          action={<Button onClick={reload}>{m.retry}</Button>}
        />
      </main>
    );
  }

  if (finance === null) {
    return (
      <main className="form-page">
        <div className="detail-stack">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </main>
    );
  }

  const activeLoan = finance.loans.find((loan) => loan.repaid_at === null) ?? null;

  const purchase = async () => {
    setPurchasing(true);
    try {
      const redirect = await openInsurancePurchase(currentUser.id, tripId);
      window.open(redirect.redirect_url, '_blank', 'noopener,noreferrer');
      message.success(m.insuranceOpenThirdParty);
    } catch (caught: unknown) {
      message.error(financeErrorText(errorCode(caught)));
    } finally {
      setPurchasing(false);
    }
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      await confirmInsurance(currentUser.id, tripId);
      message.success(m.insuranceConfirmSuccess);
      reload();
    } catch (caught: unknown) {
      message.error(financeErrorText(errorCode(caught)));
    } finally {
      setConfirming(false);
    }
  };

  const borrow = async (request: LoanCreateRequest) => {
    setBorrowing(true);
    try {
      await createLoan(currentUser.id, tripId, request);
      message.success(m.loanSuccess);
      reload();
    } catch (caught: unknown) {
      message.error(financeErrorText(errorCode(caught)));
    } finally {
      setBorrowing(false);
    }
  };

  const repay = async (loan: TravelLoan) => {
    setRepayingLoanId(loan.id);
    try {
      await repayLoan(currentUser.id, loan.id);
      message.success(m.repaySuccess);
      reload();
    } catch (caught: unknown) {
      message.error(financeErrorText(errorCode(caught)));
    } finally {
      setRepayingLoanId(null);
    }
  };

  const ineligible = ineligibleMessage(finance.ineligible_reason);

  return (
    <main className="fin-page">
      <div className="fin-head">
        <div>
          <a className="fin-back" href={`#/trips/${finance.trip_id}`}>
            ← {m.backToTrip}
          </a>
          <h1 className="fin-title">{m.title}</h1>
          <p className="fin-sub">
            {finance.trip_title} · {finance.destination} · {finance.start_date} – {finance.end_date}
          </p>
        </div>
        <div className="fin-tags">
          {finance.is_eligible ? (
            <Tag color="blue">{financeTripStatusLabel(finance.trip_status)}</Tag>
          ) : (
            <Tag color="orange">{m.ineligibleTitle}</Tag>
          )}
        </div>
      </div>

      <div className="fin-grid">
        <div className="fin-main">
          {finance.is_eligible ? (
            <>
              <InsurancePanel
                summary={finance.insurance}
                destination={finance.destination}
                startDate={finance.start_date}
                endDate={finance.end_date}
                companionCount={finance.companion_count}
                disabled={purchasing || confirming || borrowing}
                purchasing={purchasing}
                confirming={confirming}
                onPurchase={purchase}
                onConfirm={confirm}
              />
              <LoanForm
                activeLoan={activeLoan}
                disabled={borrowing}
                submitting={borrowing}
                onSubmit={borrow}
              />
            </>
          ) : (
            <section className="fin-section">
              <h3 className="panel-title">{m.ineligibleTitle}</h3>
              <p className="fin-warning">{ineligible}</p>
              <p className="fin-hint">{m.ineligibleLedgerHint}</p>
              <a className="fin-link" href="#/finance">
                {m.openMyFinance}
              </a>
            </section>
          )}
        </div>

        <aside className="fin-aside">
          <WalletCard wallet={finance.wallet} ledgerHref="#/finance" />
          <section className="fin-section">
            <h3 className="panel-title">{m.loansTripTitle}</h3>
            <LoanList loans={finance.loans} busyLoanId={repayingLoanId} onRepay={repay} />
          </section>
          <section className="fin-section">
            <h3 className="panel-title">{m.feeNoteTitle}</h3>
            <p className="fin-hint">{m.feeNote}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}