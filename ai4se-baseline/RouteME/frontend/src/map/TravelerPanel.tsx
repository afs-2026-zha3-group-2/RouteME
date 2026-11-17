/**
 * 同行者面板（refine-trip-map R2 / design D15/D17）。
 *
 * 每位展示：路线重合度（数据计算）、共同景点、旅行日期、偏好标签、
 * 「查看资料」（真实 userId → 资料页）与「发起同行邀请」（真实 tripId →
 * 行程详情申请入口；无真实行程给演示提示，MUST NOT 伪造发送成功）。
 * 面板按重合度降序（matchTravelers 已排序）。
 */

import { Button, Drawer, Empty, Tag, Typography, message } from 'antd';
import type { TravelerMatch } from './travelerMatch';

type Props = {
  open: boolean;
  onClose: () => void;
  matches: TravelerMatch[];
  /** 共同景点 id → 名称（当前城市索引）。 */
  poiName: (poiId: string) => string;
  onViewProfile: (userId: number) => void;
  onInvite: (tripId: number) => void;
};

export function TravelerPanel({ open, onClose, matches, poiName, onViewProfile, onInvite }: Props) {
  const demoInvite = (name: string) => {
    message.info(`「${name}」是演示同行者，暂无真实行程；接入真实匹配后可直接发起邀请。`);
  };
  return (
    <Drawer
      title="同行者"
      placement="right"
      width={380}
      open={open}
      onClose={onClose}
      className="traveler-panel-drawer"
    >
      <div data-testid="traveler-panel">
        {matches.length === 0 ? (
          <Empty description="这条路线暂时没有同路的旅行者" />
        ) : (
          <ul className="traveler-list">
            {matches.map(({ traveler, percent, shared }) => (
              <li key={traveler.id} className="traveler-card">
                <div className="traveler-card-head">
                  <span className="traveler-avatar" aria-hidden="true">
                    {traveler.name.slice(0, 1)}
                  </span>
                  <div className="traveler-id">
                    <b>{traveler.name}</b>
                    <span>
                      {traveler.age} 岁 · 来自{traveler.homeCity}
                    </span>
                  </div>
                  <span className="traveler-match">{percent}% 同路</span>
                </div>
                <p className="traveler-shared">
                  <span className="traveler-field-label">共同景点</span>
                  {shared.map((poiId) => (
                    <Tag key={poiId} className="traveler-shared-tag">
                      {poiName(poiId)}
                    </Tag>
                  ))}
                </p>
                <p className="traveler-dates">
                  <span className="traveler-field-label">旅行日期</span>
                  {traveler.dateRange[0] === traveler.dateRange[1]
                    ? traveler.dateRange[0]
                    : `${traveler.dateRange[0]} ~ ${traveler.dateRange[1]}`}
                </p>
                <p className="traveler-tags">
                  <span className="traveler-field-label">旅行偏好</span>
                  {traveler.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </p>
                <div className="traveler-actions">
                  {traveler.userId !== undefined && (
                    <Button size="small" onClick={() => onViewProfile(traveler.userId as number)}>
                      查看资料
                    </Button>
                  )}
                  {traveler.tripId !== undefined ? (
                    <Button size="small" type="primary" onClick={() => onInvite(traveler.tripId as number)}>
                      发起同行邀请
                    </Button>
                  ) : (
                    <Button size="small" type="primary" ghost onClick={() => demoInvite(traveler.name)}>
                      发起同行邀请
                    </Button>
                  )}
                </div>
                {traveler.tripId === undefined && (
                  <Typography.Text type="secondary" className="traveler-mock-note">
                    演示数据：该旅行者暂无真实行程。
                  </Typography.Text>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}