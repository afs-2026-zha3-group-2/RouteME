import { theme, type ThemeConfig } from 'antd';

export type ColorMode = 'light' | 'dark';

type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  line2: string;
  lagoon: string;
  lagoonSoft: string;
  jade: string;
  warn: string;
  danger: string;
  info: string;
  shadow: string;
  shadowSecondary: string;
};

/**
 * 与 styles.css 的 :root / [data-theme="dark"] 同值。
 * 改色时两处同批修改，见 openspec/changes/apply-prototype-visual-design/design.md §2。
 */
export const palettes: Record<ColorMode, Palette> = {
  light: {
    bg: '#f2ece1',
    surface: '#fffdf9',
    surface2: '#f8f2e7',
    surface3: '#f1e9db',
    ink: '#0b2a33',
    ink2: '#3f5d67',
    ink3: '#576b72',
    line: '#e4dbcb',
    line2: '#d3c7b2',
    lagoon: '#12707f',
    lagoonSoft: '#e3f0f1',
    jade: '#10925f',
    warn: '#d98613',
    danger: '#d8402f',
    info: '#2b7fd4',
    shadow: '0 1px 2px rgba(6, 35, 43, .06), 0 2px 8px -4px rgba(6, 35, 43, .1)',
    shadowSecondary: '0 2px 6px rgba(6, 35, 43, .06), 0 14px 30px -18px rgba(6, 35, 43, .34)',
  },
  dark: {
    bg: '#061116',
    surface: '#0e1f26',
    surface2: '#132a33',
    surface3: '#19343e',
    ink: '#e9f4f6',
    ink2: '#a6c1c9',
    ink3: '#869da4',
    line: '#1d3742',
    line2: '#274a57',
    lagoon: '#2b93a4',
    lagoonSoft: '#10333c',
    jade: '#2fc07f',
    warn: '#f0a93c',
    danger: '#ff6b5c',
    info: '#56a3ee',
    shadow: '0 1px 2px rgba(0, 0, 0, .5)',
    shadowSecondary: '0 2px 6px rgba(0, 0, 0, .4), 0 16px 34px -20px rgba(0, 0, 0, .9)',
  },
};

const FONT_FAMILY =
  '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';

export function buildTheme(mode: ColorMode): ThemeConfig {
  const palette = palettes[mode];

  return {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: palette.lagoon,
      colorInfo: palette.info,
      colorSuccess: palette.jade,
      colorWarning: palette.warn,
      colorError: palette.danger,
      colorBgBase: palette.bg,
      colorBgLayout: palette.bg,
      colorBgContainer: palette.surface,
      colorBgElevated: palette.surface,
      colorBorder: palette.line,
      colorBorderSecondary: palette.line,
      colorText: palette.ink,
      colorTextSecondary: palette.ink2,
      colorTextTertiary: palette.ink3,
      colorLink: palette.lagoon,
      borderRadius: 12,
      borderRadiusLG: 18,
      borderRadiusSM: 8,
      fontFamily: FONT_FAMILY,
      fontSize: 14,
      controlHeight: 38,
      boxShadow: palette.shadow,
      boxShadowSecondary: palette.shadowSecondary,
    },
    components: {
      Button: {
        fontWeight: 650,
        primaryShadow: 'none',
        dangerShadow: 'none',
        defaultShadow: 'none',
      },
      Card: {
        bodyPadding: 20,
        headerPadding: 20,
      },
      Segmented: {
        trackBg: palette.surface2,
        itemColor: palette.ink2,
        itemHoverColor: palette.ink,
        itemHoverBg: palette.surface3,
        itemSelectedBg: palette.surface,
        itemSelectedColor: palette.ink,
      },
      Tabs: {
        inkBarColor: palette.lagoon,
        itemColor: palette.ink2,
        itemHoverColor: palette.ink,
        itemSelectedColor: palette.ink,
      },
      Tag: {
        defaultBg: palette.surface3,
        defaultColor: palette.ink2,
      },
    },
  };
}