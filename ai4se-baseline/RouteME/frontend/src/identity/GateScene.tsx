import { useId } from 'react';

/**
 * Full-bleed backdrop for the identity gate, drawn in the logo's language:
 * sky gradient, amber sun, teal hills, a winding white trail and the coral pin.
 * Sits under .gate::after's paper veil so foreground text keeps its contrast.
 */
export function GateScene() {
  const uid = useId().replace(/:/g, '');
  const sky = `${uid}-sky`;
  const hill = `${uid}-hill`;
  const deep = `${uid}-deep`;
  const pin = `${uid}-pin`;

  return (
    <svg className="gate-scene" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f9fe0" />
          <stop offset="55%" stopColor="#7fd4c1" />
          <stop offset="100%" stopColor="#eaf7fb" />
        </linearGradient>
        <linearGradient id={hill} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#17a37f" />
          <stop offset="100%" stopColor="#0e8074" />
        </linearGradient>
        <linearGradient id={deep} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e8074" />
          <stop offset="60%" stopColor="#1b5a8a" />
          <stop offset="100%" stopColor="#16324f" />
        </linearGradient>
        <linearGradient id={pin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb703" />
          <stop offset="100%" stopColor="#f0503c" />
        </linearGradient>
      </defs>

      <rect width="1440" height="900" fill={`url(#${sky})`} />
      <circle cx="420" cy="250" r="70" fill="#ffb703" opacity="0.95" />
      <g fill="#fff" opacity="0.88">
        <ellipse cx="250" cy="300" rx="86" ry="30" />
        <ellipse cx="320" cy="282" rx="60" ry="24" />
        <ellipse cx="1180" cy="430" rx="74" ry="26" />
        <ellipse cx="1240" cy="414" rx="48" ry="20" />
      </g>

      <path
        d="M0 520 L240 360 L420 470 L620 350 L860 520 L1080 400 L1440 560 L1440 900 L0 900 Z"
        fill={`url(#${hill})`}
        opacity="0.9"
      />
      <path
        d="M0 640 L200 520 L430 640 L700 500 L980 660 L1240 540 L1440 660 L1440 900 L0 900 Z"
        fill={`url(#${deep})`}
      />
      <path
        d="M180 900 C180 760 520 780 520 660 C520 560 300 560 320 470 C335 400 620 420 760 330 C860 265 980 250 1040 210"
        fill="none"
        stroke="#fff"
        strokeWidth="70"
        strokeLinecap="round"
        opacity="0.92"
      />

      <path
        d="M1040 60 C1000 60 968 92 968 132 C968 186 1040 250 1040 250 C1040 250 1112 186 1112 132 C1112 92 1080 60 1040 60 Z"
        fill={`url(#${pin})`}
      />
      <circle cx="1040" cy="130" r="26" fill="#fff" />
      <path
        d="M1105 40 L1140 6 M1150 105 L1195 92"
        stroke="#ffb703"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      <g fill="var(--brand-ink)" opacity="0.92">
        <circle cx="1120" cy="700" r="26" />
        <path d="M1084 792 C1084 744 1100 724 1120 724 C1140 724 1156 744 1156 792 Z" />
        <circle cx="1200" cy="710" r="26" />
        <path d="M1164 792 C1164 748 1180 730 1200 730 C1220 730 1236 748 1236 792 Z" />
        <path
          d="M1216 730 L1258 682"
          stroke="var(--brand-ink)"
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}