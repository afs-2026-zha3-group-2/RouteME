import { useId } from 'react';

/**
 * The RouteMe brand mark, used by the shell header and the identity gate.
 * Inline SVG mirroring the logo: rounded sky panel, teal hills, amber sun,
 * a winding white trail leading to the coral pin, and two travellers.
 * The travellers' silhouette reads var(--brand-ink) so it turns light in dark mode.
 */
export function BrandMark() {
  const uid = useId().replace(/:/g, '');
  const sky = `${uid}-sky`;
  const hill = `${uid}-hill`;
  const pin = `${uid}-pin`;
  const clip = `${uid}-clip`;

  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <defs>
          <linearGradient id={sky} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3aa5e0" />
            <stop offset="100%" stopColor="#6ecfc0" />
          </linearGradient>
          <linearGradient id={hill} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#17a37f" />
            <stop offset="55%" stopColor="#0e8074" />
            <stop offset="100%" stopColor="#1b5a8a" />
          </linearGradient>
          <linearGradient id={pin} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb703" />
            <stop offset="100%" stopColor="#f0503c" />
          </linearGradient>
          <clipPath id={clip}>
            <rect x="4" y="8" width="42" height="48" rx="10" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clip})`}>
          <rect x="4" y="8" width="42" height="48" fill={`url(#${sky})`} />
          <circle cx="20" cy="21" r="6" fill="#ffb703" />
          <ellipse cx="12" cy="27" rx="6" ry="3" fill="#fff" opacity="0.92" />
          <ellipse cx="35" cy="33" rx="5" ry="2.5" fill="#fff" opacity="0.85" />
          <path
            d="M4 34 L14 26 L22 32 L30 25 L40 34 L46 30 L46 56 L4 56 Z"
            fill={`url(#${hill})`}
          />
          <path
            d="M14 56 C14 47 32 48 32 40 C32 34 20 34 22 28 C23 24 30 22 35 18"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>

        {/* destination pin with amber rays */}
        <path
          d="M44 4 C38.5 4 34 8.5 34 14 C34 21 44 30 44 30 C44 30 54 21 54 14 C54 8.5 49.5 4 44 4 Z"
          fill={`url(#${pin})`}
        />
        <circle cx="44" cy="13.5" r="4" fill="#fff" />
        <path
          d="M53 5 L57 1 M58 12 L63 10"
          stroke="#ffb703"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* travellers watching the route */}
        <g fill="var(--brand-ink)">
          <circle cx="40" cy="44" r="3.4" />
          <path d="M35.5 56 C35.5 50 37.5 47.5 40 47.5 C42.5 47.5 44.5 50 44.5 56 Z" />
          <circle cx="49" cy="45" r="3.4" />
          <path d="M44.5 56 C44.5 50.5 46.5 48 49 48 C51.5 48 53.5 50.5 53.5 56 Z" />
          <path
            d="M51 48 L56 42"
            stroke="var(--brand-ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </span>
  );
}