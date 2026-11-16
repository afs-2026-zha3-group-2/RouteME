# 设计：apply-prototype-visual-design

- **Change:** `apply-prototype-visual-design`（`design-system`）｜ **依据：** [`spec.md`](specs/design-system/spec.md)、[`proposal.md`](proposal.md)、`docs/prototype/styles.css`、`docs/prototype/ui.js`
- **规则：** `@rule:web-coding-style`、`@rule:coding-style`、`@rule:naming-conventions`

## 1. 关键取舍

### 令牌放 CSS，Ant Design 主题做同值映射

- `styles.css` 的 `:root` 与 `[data-theme="dark"]` 是视觉取值的实现权威；`src/theme.ts` 导出一份同值色板，用于 `ConfigProvider` 的 `token` 与 `components`。
- 不把令牌写进 JS 再运行时注入 `style`：那样首屏会闪烁，且 CSS 依然需要兜底值，等于两份。
- 代价是两处同值。约束：改色时 `styles.css` 与 `theme.ts` 同批修改，评审时对照 `design.md` §2 的映射表。

### 继续用 Ant Design，不引入第二套样式方案

- 需求方指定 Ant Design；表单、弹窗、选项卡、提示等交互组件保持不动，只换主题令牌与少量类名。
- 否决 Tailwind / CSS Modules / styled-components：会与 antd 的 CSS-in-JS 抢层叠顺序，并把本次改动从「换外观」扩大成「换技术栈」。
- 渐变按钮等 antd 令牌表达不了的样式，用 `.ant-btn.ant-btn-primary`（两个类，特异性 0-2-0）覆盖，避免 `!important`。

### 外壳用语义 HTML，不用 `Layout.Content`

- antd `Layout.Content` 渲染 `<main>`，而每个页面已经是 `<main>`，嵌套 `main` 不合规。
- `AppShell` 用 `div.app-shell > header.topbar + aside.rail + div.view + nav.tabbar`，`div.view` 带 `id="main-content"` 与 `tabIndex={-1}`，供跳转链接聚焦。

### 深色模式用 `data-theme` 而非重新生成一套类名

- `useColorMode` 维护 `light | dark`，写入 `document.documentElement.dataset.theme` 与 localStorage（键 `routeme.colorMode`）。
- 初值：localStorage → `prefers-color-scheme` → `light`。
- 两套主题只切换 CSS 变量与 antd `algorithm`，组件代码不感知主题。

### 行程卡抽成组件，不复制两遍

- 首页需要匹配度，我的旅行不需要；`TripCard` 的 `match` 为可选 prop，两处复用同一结构。
- 卡片整体 `<a>`，内部不再放可交互元素，避免嵌套交互控件。

## 2. 令牌映射表

| 类别 | CSS 变量 | 浅色 | 深色 | antd token |
|---|---|---|---|---|
| 页面背景 | `--bg` | `#f2ece1` | `#061116` | `colorBgBase` / `colorBgLayout` |
| 曲面 | `--surface` | `#fffdf9` | `#0e1f26` | `colorBgContainer` / `colorBgElevated` |
| 次级曲面 | `--surface-2` / `--surface-3` | `#f8f2e7` / `#f1e9db` | `#132a33` / `#19343e` | `colorFillAlter` |
| 主色（深海底色） | `--tide` | `#0f4c5c` | `#0d4453` | — |
| 主色（交互） | `--lagoon` | `#12707f` | `#2b93a4` | `colorPrimary` / `colorLink` |
| 动作色 | `--coral` | `#ff6b35` | `#ff8354` | 渐变按钮（CSS） |
| 琥珀 | `--amber` | `#f5a524` | `#ffbb3d` | 匹配度强调（CSS） |
| 松石 | `--surf` | `#12a89b` | `#2fc9b8` | — |
| 暮色紫 | `--dusk` | `#7b5cff` | `#9b83ff` | 体验卡强调（CSS） |
| 成功 / 警告 / 危险 | `--jade` / `--warn` / `--danger` | `#10925f` / `#d98613` / `#d8402f` | `#2fc07f` / `#f0a93c` / `#ff6b5c` | `colorSuccess` / `colorWarning` / `colorError` |
| 正文 / 次要 / 辅助 | `--ink` / `--ink-2` / `--ink-3` | `#0b2a33` / `#3f5d67` / `#576b72` | `#e9f4f6` / `#a6c1c9` / `#869da4` | `colorText` / `colorTextSecondary` / `colorTextTertiary` |
| 边框 | `--line` / `--line-2` | `#e4dbcb` / `#d3c7b2` | `#1d3742` / `#274a57` | `colorBorder` |
| 圆角 | `--r-sm` / `--r` / `--r-lg` / `--r-xl` | 8 / 14 / 20 / 28px | 同左 | `borderRadius` 12 / `borderRadiusLG` 18 |
| 阴影 | `--sh-1` / `--sh-2` / `--sh-3` | 三级 | 三级（更重） | `boxShadow` |
| 字体 | `--font` / `--font-num` | Segoe UI / PingFang SC 等 | 同左 | `fontFamily` |
| 外壳尺寸 | `--topbar-h` / `--rail-w` | 66px / 246px | 同左 | — |
| 断点 | 媒体查询 | 1100 / 900 / 640px | 同左 | — |

- 语义文字色（`--t-lagoon` 等）是原色相加深后的文字版本，正文只用这组，不用饱和原色。
- 动效：交互 160ms、卡片入场 450ms、背景漂移 34–47s；`prefers-reduced-motion` 下全部关闭。

## 3. 文件结构

```text
frontend/src/
  theme.ts                 buildTheme(mode)、palette、ColorMode
  shell/
    AppShell.tsx           topbar + rail + tabbar + view；跳转链接
    useColorMode.ts        light/dark 状态、持久化、data-theme
    Avatar.tsx             首字母头像（按 id 派生色相）
    EmptyState.tsx         空状态（图标 + 标题 + 说明 + 动作）
  trips/TripCard.tsx       首页 / 我的旅行共用行程卡
  home/greeting.ts         时段问候纯函数（可测）
  home/HomePage.tsx        横幅 + 视图切换 + 筛选 + 网格
  identity/IdentityGate.tsx
  experiences/ExperienceCard.tsx
  styles.css               令牌 + 基础 + 外壳 + 组件 + 页面 + antd 覆盖 + 响应式
```

- 业务目录保持不变；新增 `shell/` 只放跨页面外观组件，不含数据请求。
- `route.ts`、`api.ts`、`types.ts`、表单与筛选纯函数不动。

## 4. 外壳与导航

```text
app-shell
├─ topbar（fixed，66px）
│   ├─ brand（brand-mark + RouteMe / 路觅）
│   ├─ spacer
│   ├─ theme-toggle（aria-pressed）
│   └─ user-switch（Select，写 localStorage）
├─ rail（fixed，246px，≥900px 显示）
│   ├─ nav：旅行灵感 #/ · 发布行程 #/trips/new · 我的旅行 #/mine
│   └─ rail-foot：价值闭环六步
├─ view（margin-left: rail-w，顶部留 topbar 高度）
└─ tabbar（≤900px 显示，三项）
```

- 高亮规则：`home → 旅行灵感`；`create | share → 发布行程`；`mine → 我的旅行`；其余不高亮。
- 身份切换沿用 `App.tsx` 的 `selectUser`，不改持久化键 `routeme.currentUserId`。
- 顶部统计只取已有数据：`state.matches.length`、`experiences.state.experiences.length`。

## 5. 覆盖的页面

| 页面 | 改法 |
|---|---|
| 身份门 | 重排为品牌 + 标语 + 三卡；卡片为单个 `button` |
| 首页 | 横幅、视图切换、筛选面板、`TripCard`、`EmptyState` |
| 我的旅行 | 复用 `TripCard`；选项卡与提示沿用 antd，换主题 |
| 行程详情 / 发布 / 申请 / 分享 | 保留结构，补 `panel`、`page-head` 类名与输入控件外观 |
| 聊天 | 气泡、时间、输入区换令牌；轮询与权限逻辑不动 |
| 体验卡 | 作者 + 强度 + 正文 + 建议框 + 来源与动作 |

## 6. 风险与缓解

| 风险 | 缓解 |
|---|---|
| antd CSS-in-JS 覆盖失效 | 覆盖选择器统一两个类名；构建后人工核对按钮、输入 focus 环 |
| 令牌两处漂移 | 映射表即核对清单；本 change 的 `tasks.md` 含对照检查项 |
| 深色下部分 antd 组件对比不足 | 深色算法 + 令牌同时设置；人工检查警告/错误提示 |
| 390px 下卡片溢出 | `minmax(280px, 1fr)`、单列网格与 `overflow-wrap`；浏览器实测 |
| 视觉改动牵动既有 E2E 选择器 | 不改文案与主要类名；E2E 依赖的文本与链接保持 |

## 7. 验证方式

| 检查 | 命令 / 方式 |
|---|---|
| 类型与构建 | `cd RouteME/frontend; npm run build` |
| 单元测试 | `cd RouteME/frontend; npm test` |
| 视觉核对 | 启动后端与前端，浏览器分别以 1440×900 与 390×844 查看首页、身份门、详情、我的旅行、聊天 |
| 主题持久化 | 切换深色 → 刷新 → 仍为深色 |
| 无障碍 | 键盘 Tab 顺序、跳转链接、焦点轮廓、状态文字 |