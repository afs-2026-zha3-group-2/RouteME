import { financeMessages as m } from '../i18n/financeMessages';
import type { Wallet } from '../types';
import { money } from './financeFormat';

type Props = {
  wallet: Wallet;
  /** 聚合页不需要再链回自身。 */
  ledgerHref?: string;
};

/** 演示钱包卡：余额是本次会话所有交易的唯一口径。 */
export function WalletCard({ wallet, ledgerHref }: Props) {
  return (
    <section className="fin-wallet" aria-label={m.walletTitle}>
      <h3 className="panel-title">{m.walletTitle}</h3>
      <p className="fin-wallet-label">{m.walletBalanceLabel}</p>
      <p className="fin-balance" data-testid="wallet-balance">
        {money(wallet.balance_cents)}
      </p>
      <div className="fin-wallet-foot">
        <span>{m.walletCurrency}</span>
        <span>{m.walletScope}</span>
      </div>
      {ledgerHref !== undefined && (
        <a className="fin-link" href={ledgerHref}>
          {m.walletLedgerLink}
        </a>
      )}
    </section>
  );
}