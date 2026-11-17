/**
 * 同行者匹配面板：路线生成后展示「85% 路线重合 / 3 位同行者 / 查看同行者」，
 * 弹窗内展示共同景点、重合度、日期、偏好、查看资料与发起邀请。
 */

import { useState } from 'react';
import { Button, Modal, Tag, Typography, message } from 'antd';
import type { CompanionMatch } from './companions';

type Props = {
  matches: CompanionMatch[];
  summary: { percent: number; count: number } | null;
  onViewProfile: (userId: number) => void;
  onInvite: (tripId: number) => void;
};

export function TravelerMatchPanel({ matches, summary, onViewProfile, onInvite }: Props) {
  const [open, setOpen] = useState(false);

  if (summary === null) {
    return null;
  }

  const invite = (match: CompanionMatch) => {
    if (match.tripId === undefined) {
      message.info('这位同行者暂无可邀请的行程');
      return;
    }
    setOpen(false);
    onInvite(match.tripId);
  };

  return (
    <>
      <section className="amap-match-card" data-testid="amap-companion-summary">
        <div className="amap-match-head">
          <div className="amap-match-faces" aria-hidden="true">
            {matches.slice(0, 3).map((match) => (
              <span key={match.id}>{match.avatarInitial}</span>
            ))}
          </div>
          <div className="amap-match-text">
            <b>{summary.percent}% 路线重合</b>
            <span>{summary.count} 位同行者</span>
          </div>
        </div>
        <Button block onClick={() => setOpen(true)} data-testid="amap-companion-open">
          查看同行者
        </Button>
      </section>

      <Modal
        title="同路的旅行者"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary" className="amap-match-note">
          匹配数据来自 Mock 模型；共同景点、重合度、日期与偏好都由数据提供。
        </Typography.Paragraph>
        <ul className="amap-companion-list">
          {matches.map((match) => (
            <li key={match.id} className="amap-companion-card">
              <header>
                <span className="amap-companion-avatar" aria-hidden="true">
                  {match.avatarInitial}
                </span>
                <div className="amap-companion-id">
                  <b>{match.name}</b>
                  <span>
                    {match.homeCity} · {match.age} 岁
                  </span>
                </div>
                <span className="amap-companion-percent">{match.percent}%</span>
              </header>
              <p className="amap-companion-bio">{match.bio}</p>
              <div className="amap-companion-field">
                <span>共同景点</span>
                <div className="amap-companion-tags">
                  {match.matchedStops.map((stop) => (
                    <Tag key={stop} color="purple">
                      {stop}
                    </Tag>
                  ))}
                </div>
              </div>
              <div className="amap-companion-field">
                <span>旅行日期</span>
                <b>
                  {match.dateRange[0]} → {match.dateRange[1]}
                </b>
              </div>
              <div className="amap-companion-field">
                <span>旅行偏好</span>
                <div className="amap-companion-tags">
                  {match.preferences.map((preference) => (
                    <Tag key={preference}>{preference}</Tag>
                  ))}
                </div>
              </div>
              <footer className="amap-companion-actions">
                <Button onClick={() => onViewProfile(match.userId)}>查看资料</Button>
                <Button type="primary" onClick={() => invite(match)}>
                  发起同行邀请
                </Button>
              </footer>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}