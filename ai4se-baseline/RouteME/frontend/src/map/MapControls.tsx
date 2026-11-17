/**
 * 地图控制条（refine-trip-map R2 / design D15）。
 * 竖排右上：放大 / 缩小 / 全屏 / Reset View；aria-label 沿用 R1 口径，
 * 保证既有 e2e 与无障碍语义不变。Zoom 只缩放当前层，不换层。
 */

import { Button, Space, Tooltip } from 'antd';
import { MIN_VIEW, type Viewport } from './mapView';

function MapGlyph({ d }: { d: string }) {
  return (
    <svg className="map-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Props = {
  view: Viewport;
  fullscreen: boolean;
  onZoom: (factor: number) => void;
  onReset: () => void;
  onToggleFullscreen: () => void;
};

export function MapControls({ view, fullscreen, onZoom, onReset, onToggleFullscreen }: Props) {
  return (
    <div className="map-controls">
      <Space orientation="vertical" size={4}>
        <Tooltip title="放大" placement="left">
          <Button size="small" aria-label="放大地图" disabled={view.w <= MIN_VIEW + 0.01} onClick={() => onZoom(0.8)}>
            <MapGlyph d="M12 5v14M5 12h14" />
          </Button>
        </Tooltip>
        <Tooltip title="缩小" placement="left">
          <Button size="small" aria-label="缩小地图" disabled={view.w >= 100} onClick={() => onZoom(1.25)}>
            <MapGlyph d="M5 12h14" />
          </Button>
        </Tooltip>
        <Tooltip title={fullscreen ? '退出全屏' : '全屏查看'} placement="left">
          <Button
            size="small"
            aria-label={fullscreen ? '退出全屏' : '全屏查看地图'}
            onClick={onToggleFullscreen}
          >
            <MapGlyph
              d={fullscreen ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'}
            />
          </Button>
        </Tooltip>
        <Tooltip title="Reset View" placement="left">
          <Button size="small" aria-label="回到当前范围" onClick={onReset}>
            <MapGlyph d="M12 4v2M12 18v2M4 12h2M18 12h2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8" />
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}