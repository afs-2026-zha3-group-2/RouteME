import { Alert, Button, Skeleton, Tag } from 'antd';
import { Avatar } from '../shell/Avatar';
import { EmptyState } from '../shell/EmptyState';
import type { TravelerRecommendation } from '../types';
import {
  breakdownLines,
  emptyRecommendationText,
  formatScore,
  recommendationReason,
  referenceText,
} from './recommendation';
import type { RecommendationState } from './useRecommendations';

type Props = {
  state: RecommendationState;
  tripTitle: string;
  onRetry: () => void;
  onOpenProfile: (userId: number) => void;
};

/**
 * 同行者推荐区块：与既有「为什么推荐给你」并列但语义不同——
 * 这里回答「还可以和谁同行」，所有分值与原因均来自后端。
 */
export function TravelerRecommendationPanel({ state, tripTitle, onRetry, onOpenProfile }: Props) {
  const empty = emptyRecommendationText();
  return (
    <section className="detail-section recommendation-section">
      <h3 className="section-title">可以找谁同行</h3>
      <p className="detail-meta">{`以《${tripTitle}》的目的地、日期与你的兴趣计算`}</p>

      {state.status === 'loading' && (
        <div data-testid="recommendation-loading">
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      )}

      {state.status === 'failed' && (
        <Alert
          type="error"
          showIcon
          title="推荐加载失败"
          description={`${state.code}；行程其他信息不受影响。`}
          action={
            <Button data-testid="recommendation-retry" onClick={onRetry}>
              重试
            </Button>
          }
        />
      )}

      {state.status === 'ready' && state.data.items.length === 0 && (
        <div data-testid="recommendation-empty">
          <EmptyState title={empty.title} text={empty.text} />
        </div>
      )}

      {state.status === 'ready' && state.data.items.length > 0 && (
        <>
          <p className="form-hint">{referenceText(state.data.reference)}</p>
          <ul className="recommendation-list" data-testid="recommendation-list">
            {state.data.items.map((item) => (
              <RecommendationRow
                key={item.trip.id}
                item={item}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

type RowProps = {
  item: TravelerRecommendation;
  onOpenProfile: (userId: number) => void;
};

function RecommendationRow({ item, onOpenProfile }: RowProps) {
  const interests = item.shared_interests ?? [];
  const breakdown = item.breakdown ?? [];
  const details = breakdownLines(breakdown);
  const reason = recommendationReason(item);

  return (
    <li className="recommendation-row" data-testid="recommendation-row">
      <button
        type="button"
        className="recommendation-user"
        aria-label={`查看 ${item.user.nickname} 的资料`}
        onClick={() => onOpenProfile(item.user.id)}
      >
        <Avatar user={item.user} size="lg" />
        <span className="recommendation-user-body">
          <span className="publisher-name">{item.user.nickname}</span>
          {item.user.bio !== '' && <span className="publisher-bio">{item.user.bio}</span>}
        </span>
      </button>

      <div className="recommendation-trip">
        <a className="ghost-link" href={`#/trips/${item.trip.id}`}>
          {item.trip.title}
        </a>
        <span className="detail-meta">{`${item.trip.destination} · ${item.trip.start_date}`}</span>
      </div>

      <div className="recommendation-score">
        <span className="recommendation-score-value">{formatScore(item.score)}</span>
        {reason !== '' && (
          <span className="recommendation-reasons" data-testid="recommendation-reason">
            {reason}
          </span>
        )}
        {interests.length > 0 && (
          <span className="recommendation-interest">
            {interests.map((interest) => (
              <Tag key={interest}>{interest}</Tag>
            ))}
          </span>
        )}
        {details.length > 0 && (
          <details className="recommendation-breakdown" data-testid="recommendation-breakdown">
            <summary>查看匹配明细</summary>
            <ul className="recommendation-breakdown-list">
              {breakdown.map((entry) => (
                <li key={`${entry.dimension}-${entry.label}`}>
                  <span>{entry.label}</span>{' '}
                  <span className="recommendation-breakdown-points">{`+${entry.points}`}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}