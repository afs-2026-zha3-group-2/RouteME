/**
 * 首页重设计的内联矢量场景：不引入任何图片产物。
 * HeroScene —— 朋友站在山顶眺望海湾城市（首页 hero 背景）；
 * RailScene —— 悬崖徒步者（侧栏底部插画）；
 * AiScene —— 折叠地图与旅人（AI 规划卡插画）；
 * WeatherGlyph —— 天气代码映射的小图标。
 */

export function HeroScene() {
  return (
    <svg
      className="home-hero-scene"
      viewBox="0 0 720 420"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c5d4a" />
          <stop offset="0.42" stopColor="#5d8a66" />
          <stop offset="0.72" stopColor="#e9b45c" />
          <stop offset="1" stopColor="#f6d492" />
        </linearGradient>
        <linearGradient id="hm-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8bd6d" />
          <stop offset="0.5" stopColor="#7fae8f" />
          <stop offset="1" stopColor="#3f7261" />
        </linearGradient>
        <linearGradient id="hm-ridge-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6f9a77" />
          <stop offset="1" stopColor="#4d7c62" />
        </linearGradient>
        <linearGradient id="hm-ridge-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f5c47" />
          <stop offset="1" stopColor="#1d4232" />
        </linearGradient>
        <radialGradient id="hm-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3cf" />
          <stop offset="0.55" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 天空与落日 */}
      <rect width="720" height="420" fill="url(#hm-sky)" />
      <circle cx="500" cy="208" r="120" fill="url(#hm-sun)" />
      <circle cx="500" cy="208" r="42" fill="#ffe9b0" />

      {/* 云带 */}
      <g fill="#f7e3b2" opacity="0.5">
        <ellipse cx="180" cy="120" rx="90" ry="12" />
        <ellipse cx="300" cy="96" rx="60" ry="8" />
        <ellipse cx="600" cy="140" rx="76" ry="10" />
      </g>

      {/* 远山 */}
      <path
        d="M0 250 L90 190 L170 240 L260 176 L340 238 L430 196 L520 246 L620 200 L720 244 L720 420 L0 420 Z"
        fill="url(#hm-ridge-far)"
        opacity="0.85"
      />

      {/* 海湾 */}
      <path d="M0 286 Q 360 262 720 284 L720 420 L0 420 Z" fill="url(#hm-sea)" />
      <g stroke="#ffe9b0" strokeWidth="2.4" strokeLinecap="round" opacity="0.65">
        <path d="M470 300 h60" />
        <path d="M488 314 h40" />
        <path d="M460 330 h72" />
        <path d="M500 346 h34" />
      </g>

      {/* 对岸城市天际线（含塔尖） */}
      <g fill="#274b3c">
        <rect x="556" y="238" width="16" height="46" />
        <rect x="578" y="222" width="14" height="62" />
        <rect x="598" y="246" width="18" height="38" />
        <rect x="622" y="230" width="12" height="54" />
        <rect x="640" y="252" width="20" height="32" />
        <rect x="666" y="236" width="14" height="48" />
        <rect x="686" y="250" width="18" height="34" />
        <path d="M610 246 L614 196 L618 246 Z" />
        <circle cx="614" cy="206" r="5" />
      </g>
      <g fill="#ffd98a" opacity="0.85">
        <rect x="581" y="230" width="3" height="3" />
        <rect x="586" y="240" width="3" height="3" />
        <rect x="625" y="238" width="3" height="3" />
        <rect x="670" y="244" width="3" height="3" />
        <rect x="602" y="252" width="3" height="3" />
      </g>

      {/* 近景山崖 */}
      <path
        d="M0 420 L0 268 L64 252 L128 286 L188 318 L246 360 L300 420 Z"
        fill="url(#hm-ridge-near)"
      />
      <path d="M0 268 L64 252 L128 286 L96 300 L40 288 Z" fill="#3c6b52" />

      {/* 两位旅人剪影：一位指向远方，一位背包站立 */}
      <g fill="#132b21">
        {/* 指向远方的人 */}
        <circle cx="96" cy="238" r="8" />
        <path d="M90 246 q6 -4 12 0 l4 26 -6 2 -2 22 -5 0 -2 -22 -5 -2 z" />
        <path d="M99 250 l22 -12 3 4 -21 14 z" />
        <path d="M92 272 l-4 24 5 1 5 -22 z" />
        {/* 背包的人 */}
        <circle cx="132" cy="252" r="7.4" />
        <path d="M126 259 q6 -4 12 0 l3 24 -5 2 -2 20 -5 0 -2 -20 -4 -2 z" />
        <path d="M123 262 q-7 4 -5 16 l6 1 z" />
        <path d="M129 285 l-3 20 5 1 4 -19 z" />
      </g>

      {/* 飞鸟 */}
      <g stroke="#1d4232" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8">
        <path d="M330 120 q6 -6 12 0 q6 -6 12 0" />
        <path d="M376 146 q5 -5 10 0 q5 -5 10 0" />
        <path d="M296 150 q4 -4 8 0 q4 -4 8 0" />
      </g>
    </svg>
  );
}

export function RailScene() {
  return (
    <svg
      className="rail-scene"
      viewBox="0 0 220 132"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="rail-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3e7cd" stopOpacity="0" />
          <stop offset="1" stopColor="#ecd9ae" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="220" height="132" fill="url(#rail-sky)" />
      <circle cx="160" cy="44" r="17" fill="#e8a33d" opacity="0.85" />
      <path d="M0 92 L46 62 L92 90 L138 66 L186 92 L220 74 L220 132 L0 132 Z" fill="#7fa383" opacity="0.55" />
      <path d="M0 108 L60 84 L120 108 L176 90 L220 106 L220 132 L0 132 Z" fill="#4d7c62" opacity="0.7" />
      {/* 悬崖与徒步者 */}
      <path d="M0 132 L0 96 L34 90 L62 104 L84 132 Z" fill="var(--brand-ink)" opacity="0.9" />
      <g fill="var(--brand-ink)">
        <circle cx="46" cy="72" r="6" />
        <path d="M41 78 q5 -3 10 0 l3 18 -4 2 -2 14 -4 0 -2 -14 -4 -2 z" />
        <path d="M49 82 l12 -8 2 3 -11 9 z" />
        <path d="M58 70 l2 26" stroke="var(--brand-ink)" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 80 q-6 3 -4 12 l5 1 z" />
      </g>
      {/* 山顶小旗 */}
      <path d="M138 66 l0 -16" stroke="var(--brand-ink)" strokeWidth="2" strokeLinecap="round" />
      <path d="M138 50 l14 4 -14 5 z" fill="#c2543a" />
      <g stroke="var(--brand-ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M96 34 q4 -4 8 0 q4 -4 8 0" />
        <path d="M120 22 q3 -3 6 0 q3 -3 6 0" />
      </g>
    </svg>
  );
}

export function AiScene() {
  return (
    <svg
      className="home-ai-scene"
      viewBox="0 0 280 150"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ai-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf8ec" />
          <stop offset="1" stopColor="#f0e4c8" />
        </linearGradient>
      </defs>
      {/* 折叠地图 */}
      <g>
        <path d="M40 34 L104 22 L104 118 L40 130 Z" fill="url(#ai-paper)" stroke="#c9b98f" strokeWidth="1.4" />
        <path d="M104 22 L168 34 L168 130 L104 118 Z" fill="#f6eeda" stroke="#c9b98f" strokeWidth="1.4" />
        <path d="M168 34 L232 22 L232 118 L168 130 Z" fill="url(#ai-paper)" stroke="#c9b98f" strokeWidth="1.4" />
        {/* 地图纹理 */}
        <g stroke="#b9c9a8" strokeWidth="1.2" opacity="0.8" fill="none">
          <path d="M50 52 q20 -8 44 2" />
          <path d="M52 96 q24 6 44 -4" />
          <path d="M178 50 q22 -6 44 4" />
          <path d="M180 100 q20 6 42 -2" />
        </g>
        <path d="M112 44 q18 10 34 2" stroke="#9db8d8" strokeWidth="3" fill="none" opacity="0.8" />
        {/* 虚线路径 */}
        <path
          d="M62 108 C 90 78, 118 96, 138 66 S 196 58, 214 40"
          stroke="#1e4d3a"
          strokeWidth="2.6"
          strokeDasharray="6 5"
          fill="none"
          strokeLinecap="round"
        />
        {/* 图钉 */}
        <g>
          <path d="M62 108 c-7 -9 -7 -18 0 -22 c7 4 7 13 0 22 z" fill="#c2543a" />
          <circle cx="62" cy="92" r="3.2" fill="#fdf8ec" />
          <path d="M138 66 c-7 -9 -7 -18 0 -22 c7 4 7 13 0 22 z" fill="#e8a33d" />
          <circle cx="138" cy="50" r="3.2" fill="#fdf8ec" />
          <path d="M214 40 c-7 -9 -7 -18 0 -22 c7 4 7 13 0 22 z" fill="#1e4d3a" />
          <circle cx="214" cy="24" r="3.2" fill="#fdf8ec" />
        </g>
      </g>
      {/* 指南针 */}
      <g transform="translate(246 116)">
        <circle r="14" fill="#fdf8ec" stroke="#c9b98f" strokeWidth="1.4" />
        <path d="M0 -9 L3 3 L0 0 L-3 3 Z" fill="#c2543a" />
        <path d="M0 9 L3 -3 L0 0 L-3 -3 Z" fill="#1e4d3a" opacity="0.6" />
      </g>
      {/* 小旅人 */}
      <g fill="#1e4d3a" transform="translate(28 106)">
        <circle cx="0" cy="-16" r="5" />
        <path d="M-4 -11 q4 -3 8 0 l2 12 -3 1 -1 10 -4 0 -1 -10 -3 -1 z" />
        <path d="M3 -8 l8 -5 1.6 2.4 -8 5.6 z" />
      </g>
      {/* AI 星芒 */}
      <g fill="#e8a33d">
        <path d="M244 26 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 z" />
        <path d="M30 40 l1.8 4.4 4.4 1.8 -4.4 1.8 -1.8 4.4 -1.8 -4.4 -4.4 -1.8 4.4 -1.8 z" opacity="0.8" />
      </g>
    </svg>
  );
}

/** Open-Meteo weather_code → 图标；未知代码回退太阳，保证任何响应都有图。 */
export function WeatherGlyph({ code }: { code: number | null }) {
  const kind =
    code === null
      ? 'sun'
      : code <= 1
        ? 'sun'
        : code === 2
          ? 'partly'
          : code === 3
            ? 'cloud'
            : code === 45 || code === 48
              ? 'fog'
              : (code >= 51 && code <= 67) || (code >= 80 && code <= 82)
                ? 'rain'
                : (code >= 71 && code <= 77) || code === 85 || code === 86
                  ? 'snow'
                  : code >= 95
                    ? 'storm'
                    : 'sun';
  return (
    <svg className={`home-weather-glyph is-${kind}`} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {kind === 'sun' && (
        <g>
          <circle cx="24" cy="24" r="9.5" fill="#e8a33d" />
          <g stroke="#e8a33d" strokeWidth="2.6" strokeLinecap="round">
            <path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.5 10.5l3.5 3.5M34 34l3.5 3.5M37.5 10.5 34 14M14 34l-3.5 3.5" />
          </g>
        </g>
      )}
      {kind === 'partly' && (
        <g>
          <circle cx="18" cy="18" r="8" fill="#e8a33d" />
          <g stroke="#e8a33d" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 4v4M4 18h4M8 8l2.8 2.8M28 8l-2.8 2.8" />
          </g>
          <path d="M14 36 a7 7 0 0 1 1-13.9 a9 9 0 0 1 17.4 2.4 a6 6 0 0 1 -1.4 11.5 z" fill="#c8d6cf" />
        </g>
      )}
      {kind === 'cloud' && (
        <path d="M12 36 a7.5 7.5 0 0 1 1.2-14.9 a10 10 0 0 1 19.4 2.6 a6.6 6.6 0 0 1 -1.6 12.3 z" fill="#a9bfb4" />
      )}
      {kind === 'fog' && (
        <g>
          <path d="M12 28 a7 7 0 0 1 1.2-13.9 a9.4 9.4 0 0 1 18.2 2.4 a6.2 6.2 0 0 1 -1.4 11.5 z" fill="#a9bfb4" />
          <g stroke="#8fa69b" strokeWidth="2.6" strokeLinecap="round">
            <path d="M10 34h28M14 40h20" />
          </g>
        </g>
      )}
      {kind === 'rain' && (
        <g>
          <path d="M12 28 a7 7 0 0 1 1.2-13.9 a9.4 9.4 0 0 1 18.2 2.4 a6.2 6.2 0 0 1 -1.4 11.5 z" fill="#8fb0a2" />
          <g stroke="#3f7261" strokeWidth="2.6" strokeLinecap="round">
            <path d="M16 33l-2.4 6M24 33l-2.4 6M32 33l-2.4 6" />
          </g>
        </g>
      )}
      {kind === 'snow' && (
        <g>
          <path d="M12 28 a7 7 0 0 1 1.2-13.9 a9.4 9.4 0 0 1 18.2 2.4 a6.2 6.2 0 0 1 -1.4 11.5 z" fill="#c8d6cf" />
          <g fill="#5d8a66">
            <circle cx="16" cy="36" r="2" />
            <circle cx="24" cy="40" r="2" />
            <circle cx="32" cy="36" r="2" />
          </g>
        </g>
      )}
      {kind === 'storm' && (
        <g>
          <path d="M12 26 a7 7 0 0 1 1.2-13.9 a9.4 9.4 0 0 1 18.2 2.4 a6.2 6.2 0 0 1 -1.4 11.5 z" fill="#7d988c" />
          <path d="M25 28l-6 9h5l-3 8 9-11h-5l4-6z" fill="#e8a33d" />
        </g>
      )}
    </svg>
  );
}