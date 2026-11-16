import type { SVGProps } from 'react';
import type { TripStatus } from '../types';
import { statusLabel, statusTone } from './tripStatus';

const ICON_PROPS: SVGProps<SVGSVGElement> = {
  className: 'status-icon',
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

type Props = {
  status: TripStatus;
  /** 附加类名，用于在体验卡来源行等局部收窄尺寸。 */
  className?: string;
};

/**
 * 行程状态徽标：文字 + 形状图标。
 * 颜色只作增强，`data-status` / `data-status-icon` 让状态可以不依赖颜色被识别。
 */
export function StatusBadge({ status, className }: Props) {
  const classes = ['badge', statusTone(status), 'has-icon', className].filter(Boolean).join(' ');
  return (
    <span className={classes} data-status={status}>
      <StatusIcon status={status} />
      {statusLabel(status)}
    </span>
  );
}

function StatusIcon({ status }: { status: TripStatus }) {
  if (status === 'full') {
    return (
      <svg {...ICON_PROPS} data-status-icon={status}>
        <rect x="3.2" y="7" width="9.6" height="6.6" rx="1.6" />
        <path d="M5.4 7V5.1a2.6 2.6 0 0 1 5.2 0V7" />
      </svg>
    );
  }
  if (status === 'completed') {
    return (
      <svg {...ICON_PROPS} data-status-icon={status}>
        <path d="M4 2.6v11.2" />
        <path d="M4 3.2h7.4l-1.6 3 1.6 3H4" />
      </svg>
    );
  }
  return (
    <svg {...ICON_PROPS} data-status-icon={status}>
      <circle cx="6" cy="5.6" r="2.2" />
      <path d="M2.6 13c.4-2.3 1.8-3.5 3.4-3.5s3 1.2 3.4 3.5" />
      <path d="M12 5.2v4M10 7.2h4" />
    </svg>
  );
}