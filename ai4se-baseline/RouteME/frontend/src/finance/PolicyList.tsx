import { Tag } from 'antd';
import { financeMessages as m } from '../i18n/financeMessages';
import type { InsurancePolicy } from '../types';
import { insurancePolicyStatusLabel } from './financeLabels';

type Props = {
  policies: InsurancePolicy[];
  /** 聚合页展示保险所属行程；行程维度页不需要。 */
  tripTitles?: Record<number, string>;
};

/** 账号聚合页的保险记录：提供方、保障期与状态，详情回到行程保障页。 */
export function PolicyList({ policies, tripTitles }: Props) {
  if (policies.length === 0) {
    return <p className="fin-empty">{m.insuranceListEmpty}</p>;
  }

  return (
    <>
      <p className="fin-hint">{m.insuranceListHint}</p>
      <ul className="fin-list">
        {policies.map((policy) => (
          <li className="fin-row" key={policy.id}>
            <div className="fin-row-main">
              <b>{tripTitles?.[policy.trip_id] ?? `行程 #${policy.trip_id}`}</b>
              <span>
                {policy.provider} · {m.insurancePeriod(policy.coverage_start, policy.coverage_end)}
              </span>
            </div>
            <div className="fin-row-side">
              <Tag color={policy.status === 'active' ? 'green' : 'default'}>
                {insurancePolicyStatusLabel(policy.status)}
              </Tag>
              <a className="fin-link" href={`#/trips/${policy.trip_id}/finance`}>
                {m.insuranceListOpen}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}