import { profileMessages } from '../i18n/profileMessages';
import type { UserGrowth } from '../types';
import { expProgress } from './growth';

/**
 * 本人成长进度块：仅在响应带经验时渲染；他人视角 `expProgress` 返回 null。
 */
export function GrowthProgressBlock({ growth }: { growth?: UserGrowth | null }) {
  const progress = expProgress(growth);
  if (progress === null) {
    return null;
  }
  return (
    <div className="growth-progress">
      <div className="gp-top">
        <span>{profileMessages.growthProgressTitle}</span>
        <b>{progress.counter}</b>
      </div>
      <div className="gp-track">
        <i style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="gp-hint">{progress.hint}</p>
    </div>
  );
}
