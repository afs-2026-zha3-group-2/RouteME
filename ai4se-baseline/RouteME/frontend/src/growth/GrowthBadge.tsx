import { tripMessages } from '../i18n/tripMessages';
import type { UserGrowthEntry } from '../types';
import { isMaxLevel, levelLabel } from './growth';

type Props = {
  level?: number | null;
  maxLevel?: boolean | null;
  /** 主页 / 弹窗显示「成长等级」小字；列表类展示面只留 `LVn`。 */
  withLabel?: boolean;
};

/**
 * 成长徽标：与信用分徽标并列但色阶与文案区分（青绿、`LVn`）。
 * LV5 用实心徽标 + `400+ · 已满级`，不出现 LV6。
 */
export function GrowthBadge({ level, maxLevel, withLabel = false }: Props) {
  if (level === null || level === undefined) {
    return null;
  }
  const maxed = isMaxLevel(level, maxLevel);
  return (
    <span className={maxed ? 'growth-pill lv5' : 'growth-pill'}>
      <em>{levelLabel(level)}</em>
      {maxed ? (
        <small>{tripMessages.growthMaxBadge}</small>
      ) : (
        withLabel && <small>{tripMessages.growthLevel}</small>
      )}
    </span>
  );
}

/** 列表类展示面的快捷入口：直接消费批量读取结果。 */
export function GrowthBadgeOf({ entry }: { entry?: UserGrowthEntry }) {
  if (entry === undefined) {
    return null;
  }
  return <GrowthBadge level={entry.level} />;
}
