import type { ThemeConfig } from 'antd';

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
 * 与 styles.css 的 :root 同值。
 * 改色时两处同批修改，见 openspec/changes/apply-prototype-visual-design/design.md §2。
 */
const palette: Palette = {
  bg: '#f5f8fb',
  surface: '#ffffff',
  surface2: '#eef4f9',
  surface3: '#e2ecf4',
  ink: '#16324f',
  ink2: '#3e5c7c',
  ink3: '#67809b',
  line: '#dce7f0',
  line2: '#c2d4e2',
  lagoon: '#0e8074',
  lagoonSoft: '#e0f4ee',
  jade: '#149a63',
  warn: '#d98613',
  danger: '#e0483a',
  info: '#2f9fe0',
  shadow: '0 1px 2px rgba(20, 51, 95, .06), 0 2px 8px -4px rgba(20, 51, 95, .1)',
  shadowSecondary: '0 2px 6px rgba(20, 51, 95, .06), 0 14px 30px -18px rgba(20, 51, 95, .3)',
};

const FONT_FAMILY =
  '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';

export function buildTheme(): ThemeConfig {
  return {
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
      borderRadius: 14,
      borderRadiusLG: 20,
      borderRadiusSM: 10,
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