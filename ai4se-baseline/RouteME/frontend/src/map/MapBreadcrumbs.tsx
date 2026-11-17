/**
 * 地图面包屑（refine-trip-map R2 / design D15）。
 * 「中国 > 广东省 > 广州市」逐级可回层；最后一项为当前层不可点。
 * 回层走路由（URL 为层级唯一权威），不是 Zoom。
 */

export type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

export function MapBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="map-breadcrumbs" data-testid="map-breadcrumbs" aria-label="地图层级">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="map-breadcrumb-item">
            {index > 0 && (
              <span className="map-breadcrumb-sep" aria-hidden="true">
                ›
              </span>
            )}
            {isLast || item.onClick === undefined ? (
              <span className={isLast ? 'map-breadcrumb-current' : 'map-breadcrumb-link'} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            ) : (
              <button type="button" className="map-breadcrumb-link" onClick={item.onClick}>
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}