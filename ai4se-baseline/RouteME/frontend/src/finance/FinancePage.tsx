import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton, message } from 'antd';
import { formatDateTime } from '../admin/adminFormat';
import { loadMyFinance, loadMyTrips, repayLoan } from '../api';
import { financeMessages as m } from '../i18n/financeMessages';
import type { DemoUser, MyFinance, MyTrips, TravelLoan, TripSummary } from '../types';
import { FINANCE_OPEN_STATUSES } from './financeEligibility';
import { financeErrorText, financeTripStatusLabel, ledgerEntryLabel } from './financeLabels';
import { money } from './financeFormat';
import { LoanList } from './LoanList';
import { PolicyList } from './PolicyList';
import { WalletCard } from './WalletCard';

type Props = {
  currentUser: DemoUser;
};

function errorCode(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
}

/** 从「我的旅行」挑出仍可交易的行程（发布 + 已接受），按出发日升序。 */
function financeTripsOf(mine: MyTrips): TripSummary[] {
  const byId = new Map<number, TripSummary>();
  for (const trip of mine.published) {
    byId.set(trip.id, trip);
  }
  for (const application of mine.applied) {
    if (application.status === 'accepted') {
      byId.set(application.trip.id, application.trip);
    }
  }
  return [...byId.values()]
    .filter((trip) => FINANCE_OPEN_STATUSES.includes(trip.status))
    .sort((left, right) => left.start_date.localeCompare(right.start_date));
}

/** 账号聚合页：钱包、全部保险记录 / 借款、可交易行程与钱包流水。 */
export function FinancePage({ currentUser }: Props) {
  const [finance, setFinance] = useState<MyFinance | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [repayingLoanId, setRepayingLoanId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    Promise.all([loadMyFinance(currentUser.id), loadMyTrips(currentUser.id)])
      .then(([loadedFinance, mine]) => {
        if (active) {
          setFinance(loadedFinance);
          setTrips(financeTripsOf(mine));
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
  }, [currentUser.id, reloadKey]);

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

  const tripTitles = Object.fromEntries(trips.map((trip) => [trip.id, trip.title]));
  const activeLoan = finance.loans.find((loan) => loan.repaid_at === null) ?? null;
  const ledger = [...finance.ledger].reverse();

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

  return (
    <main className="fin-page">
      <div className="fin-head">
        <div>
          <h1 className="fin-title">{m.myTitle}</h1>
          <p className="fin-sub">{m.subtitle}</p>
        </div>
        <a className="fin-link" href="#/">
          {m.backToTrips}
        </a>
      </div>

      <div className="fin-grid">
        <div className="fin-main">
          <section className="fin-section">
            <h3 className="panel-title">{m.insuranceListTitle}</h3>
            <PolicyList policies={finance.policies} tripTitles={tripTitles} />
          </section>
          <section className="fin-section">
            <h3 className="panel-title">{m.loansTitle}</h3>
            <LoanList
              loans={finance.loans}
              tripTitles={tripTitles}
              busyLoanId={repayingLoanId}
              onRepay={repay}
            />
          </section>
        </div>

        <aside className="fin-aside">
          <WalletCard wallet={finance.wallet} />
          <section className="fin-section">
            <h3 className="panel-title">{m.summaryTitle}</h3>
            <dl className="fin-facts">
              <div>
                <dt>{m.summaryPolicies}</dt>
                <dd>{finance.policies.length}</dd>
              </div>
              <div>
                <dt>{m.summaryLoans}</dt>
                <dd>{finance.loans.length}</dd>
              </div>
              <div>
                <dt>{m.summaryActiveLoan}</dt>
                <dd>{activeLoan === null ? m.summaryNone : money(activeLoan.repay_cents)}</dd>
              </div>
              <div>
                <dt>{m.summaryOpenTrips}</dt>
                <dd>{trips.length}</dd>
              </div>
            </dl>
          </section>
          <section className="fin-section">
            <h3 className="panel-title">{m.tripsTitle}</h3>
            {trips.length === 0 ? (
              <p className="fin-empty">{m.tripsEmpty}</p>
            ) : (
              <ul className="fin-trip-list">
                {trips.map((trip) => (
                  <li key={trip.id}>
                    <a className="fin-trip-row" href={`#/trips/${trip.id}/finance`}>
                      <span className="fin-trip-main">
                        <b>{trip.title}</b>
                        <i>
                          {trip.start_date} – {trip.end_date} ·{' '}
                          {financeTripStatusLabel(trip.status) ?? trip.status}
                        </i>
                      </span>
                      <span aria-hidden="true">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="fin-section">
            <h3 className="panel-title">{m.ledgerTitle}</h3>
            {ledger.length === 0 ? (
              <p className="fin-empty">{m.ledgerEmpty}</p>
            ) : (
              <ul className="fin-ledger">
                {ledger.map((entry) => (
                  <li className="fin-ledger-row" key={entry.id}>
                    <span className="fin-ledger-type">
                      {ledgerEntryLabel(entry.entry_type)}
                      <i>
                        {formatDateTime(entry.occurred_at)} ·{' '}
                        {m.ledgerAfter(money(entry.balance_after_cents))}
                      </i>
                    </span>
                    <span className={`fin-ledger-amount ${entry.direction}`}>
                      {entry.direction === 'credit' ? '+' : '−'}
                      {money(entry.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}