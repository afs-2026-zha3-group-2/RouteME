import type { ReactNode } from 'react';
import {
  donutSegments,
  formatCount,
  percentOf,
  stackSegments,
  windowRatio,
  type Counts,
} from './dashboardFormat';

/** 五种图表色调，对应 styles.css 的 --admin-chart-1..5（随主题切换）。 */
type ChartTone = 1 | 2 | 3 | 4 | 5;

function toneOf(order: readonly string[], key: string): ChartTone {
  return (((order.indexOf(key) % 5) + 1) as ChartTone);
}

type CardProps = {
  testId: string;
  title: string;
  total: number;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
};

/**
 * 概览指标卡：可跳转卡整卡为 <a>（键盘可达），不可跳转卡为 <section>。
 * 只负责版式，计数与图表全部由调用方传入。
 */
export function AdminMetricCard({ testId, title, total, href, hrefLabel, children }: CardProps) {
  const content = (
    <>
      <header className="admin-metric-head">
        <h2 className="admin-metric-title">{title}</h2>
        <span className="admin-metric-total" data-testid={`${testId}-total`}>
          {formatCount(total)}
        </span>
      </header>
      <div className="admin-metric-visual">{children}</div>
    </>
  );

  if (href !== undefined) {
    return (
      <a className="admin-metric-card is-link" data-testid={testId} href={href} aria-label={hrefLabel}>
        {content}
      </a>
    );
  }

  return (
    <section className="admin-metric-card" data-testid={testId}>
      {content}
    </section>
  );
}

type StackBarProps = {
  counts: Counts;
  order: readonly string[];
  labels: Record<string, string>;
  ariaLabel: string;
  testId?: string;
};

/**
 * 堆叠分布条：段宽按计数比例（flex-grow），总数 0 时只显示空轨道；
 * 图例始终列出固定键序的全部键与 0 值。
 */
export function StackBar({ counts, order, labels, ariaLabel, testId }: StackBarProps) {
  const segments = stackSegments(counts, order, labels);
  const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);

  return (
    <div className="admin-stack" data-testid={testId}>
      <div className="admin-stack-track" role="img" aria-label={ariaLabel}>
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`admin-stack-seg admin-chart-tone-${toneOf(order, segment.key)}`}
            style={{ flexGrow: segment.value }}
          />
        ))}
      </div>
      <ul className="admin-chart-legend">
        {order.map((key) => (
          <li key={key}>
            <span
              className={`admin-chart-dot admin-chart-tone-${toneOf(order, key)}`}
              aria-hidden="true"
            />
            <span className="admin-chart-legend-label">{labels[key] ?? key}</span>
            <span className="admin-chart-legend-value">{formatCount(counts[key] ?? 0)}</span>
            <span className="admin-chart-legend-percent">
              {percentOf(counts[key] ?? 0, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type MeterProps = {
  label: string;
  value: number;
  windowDays: number;
  tone: ChartTone;
};

/** 新增密度条：数值按窗口天数折算比例，封顶 100%；0 值显示空轨道。 */
export function NewWindowMeter({ label, value, windowDays, tone }: MeterProps) {
  const ratio = windowRatio(value, windowDays);

  return (
    <div className="admin-meter">
      <div className="admin-meter-head">
        <span className="admin-meter-label">{label}</span>
        <span className="admin-meter-value">
          {formatCount(value)}
          <span className="admin-meter-ratio">{ratio}%</span>
        </span>
      </div>
      <div
        className="admin-meter-track"
        role="img"
        aria-label={`${label}：${value}（${ratio}%）`}
      >
        <span
          className={`admin-meter-fill admin-chart-tone-${tone}`}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

type DonutProps = {
  counts: Counts;
  order: readonly string[];
  labels: Record<string, string>;
  centerValue: number;
  centerLabel: string;
  ariaLabel: string;
};

/** 环形占比：内联 SVG + stroke-dasharray，无图表依赖；0 总数时只留灰色底环。 */
export function DonutChart({
  counts,
  order,
  labels,
  centerValue,
  centerLabel,
  ariaLabel,
}: DonutProps) {
  const segments = donutSegments(counts, order);
  const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="admin-donut">
      <div className="admin-donut-figure">
        <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel}>
          <circle
            className="admin-donut-track"
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="13"
          />
          {segments
            .filter((segment) => segment.percent > 0)
            .map((segment) => (
              <circle
                key={segment.key}
                className={`admin-donut-seg admin-chart-tone-${toneOf(order, segment.key)}`}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="13"
                transform="rotate(-90 50 50)"
                strokeDasharray={`${(segment.percent / 100) * circumference} ${circumference}`}
                strokeDashoffset={`${(-segment.offset / 100) * circumference}`}
              />
            ))}
        </svg>
        <div className="admin-donut-center" aria-hidden="true">
          <b>{formatCount(centerValue)}</b>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="admin-chart-legend">
        {order.map((key) => (
          <li key={key}>
            <span
              className={`admin-chart-dot admin-chart-tone-${toneOf(order, key)}`}
              aria-hidden="true"
            />
            <span className="admin-chart-legend-label">{labels[key] ?? key}</span>
            <span className="admin-chart-legend-value">{formatCount(counts[key] ?? 0)}</span>
            <span className="admin-chart-legend-percent">
              {percentOf(counts[key] ?? 0, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}