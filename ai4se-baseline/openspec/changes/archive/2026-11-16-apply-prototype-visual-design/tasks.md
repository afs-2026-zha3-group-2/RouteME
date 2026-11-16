# 任务：apply-prototype-visual-design

- **依据：** [`spec.md`](specs/design-system/spec.md)、[`design.md`](design.md)
- **约束：** 一条任务只落一层；不触碰接口、数据与业务规则；每条任务给出验证方式与覆盖场景。

## 任务清单

### T1 [frontend] 令牌、主题与基础样式

- [x] `src/theme.ts`：导出 `palette`（浅 / 深）与 `buildTheme(mode)`，映射颜色、圆角、字体、控件高度到 antd `token` / `components`。
- [x] `src/styles.css` 重写：tokens → base → shell → components → pages → antd 覆盖 → responsive 分区；写入 `--bg/--surface/--ink/--lagoon/--coral/--line/--r/--sh-*` 等变量与深色覆盖。
- [x] `main.tsx` 移除外层 `ConfigProvider`，由 `App` 按当前主题渲染。

**验证：** `cd RouteME/frontend; npm run build`
**覆盖：** 设计令牌与主题映射（2 场景）

### T2 [frontend] 应用外壳与导航

- [x] `shell/AppShell.tsx`：固定顶栏、品牌标记、主题开关、身份切换、左侧导航、窄屏标签栏、跳过导航链接。
- [x] `shell/useColorMode.ts`：localStorage 键 `routeme.colorMode`，初值读系统偏好，写 `data-theme`。
- [x] `App.tsx` 改用 `AppShell` 包住路由内容；身份切换与错误 / 加载分支保持原行为。

**验证：** `npm run build`；浏览器点击导航、切换身份、切换主题
**覆盖：** 应用外壳与导航（4 场景）、深色模式（2 场景）

### T3 [frontend] 身份进入页

- [x] `identity/IdentityGate.tsx` 重排为品牌 + 标语 + 价值闭环 + 三张身份卡（头像、昵称、学校、简介、兴趣、进入动作）。
- [x] 卡片整体为 `button`，保留原有 `onSelect`；不新增注册入口。

**验证：** 浏览器 390px / 1440px 各看一次；点击任一卡片进入首页
**覆盖：** 身份进入页呈现（2 场景）

### T4 [frontend] 首页与行程卡

- [x] `home/greeting.ts` + `home/greeting.test.ts`：按时段返回问候语，覆盖 5 个边界。
- [x] `trips/TripCard.tsx`：封面、状态徽标、标题、日期、路线、标签、匹配度、发布者、人数进度；`match` 可选。
- [x] `home/HomePage.tsx`：问候横幅（真实计数）、视图切换、筛选面板（搜索 / 目的地 / 日期 / 排序 / 兴趣胶囊 / 已应用条件）、卡片网格、空状态。
- [x] `mine/MyTripsPage.tsx` 复用 `TripCard`，移除本地重复实现。

**验证：** `npm test`；浏览器检查卡片字段与点击跳转
**覆盖：** 首页信息层级（3 场景）、组件外观一致性（3 场景）

### T5 [frontend] 其余页面外观

- [x] `experiences/ExperienceCard.tsx`：作者、强度、正文、建议框、来源与两个动作。
- [x] 详情 / 发布 / 申请 / 分享页补语义类名（`panel`、`page-head`、`detail-*`），行为与文案不变。
- [x] 聊天页气泡与输入区换令牌；轮询、只读与权限不变。
- [x] 空状态、骨架、提示条统一外观。

**验证：** `npm test`；浏览器走一遍申请 → 接受 → 聊天 → 分享
**覆盖：** 组件外观一致性（3 场景）

### T6 [frontend] 响应式与无障碍

- [x] 1100 / 900 / 640 断点：侧栏收起、标签栏出现、单列网格。
- [x] 跳转链接、`focus-visible` 轮廓、`prefers-reduced-motion` 关闭漂移与入场动画。
- [x] 状态徽标保留文字；语义文字色使用加深后的 `--t-*`。

**验证：** 浏览器 1440 / 1024 / 768 / 390 无横向滚动；键盘 Tab 走查
**覆盖：** 响应式与动效约束（2 场景）

### T7 [docs] 文档与变更收口

- [x] `docs/knowledge/architecture/README.md` 登记 `design-system` 的落点与令牌权威。
- [x] `docs/knowledge/_LOG.md` 记录本次知识库更新。
- [x] 写 `summary.md` 与本地验证报告（真实命令 + 输出摘要）。

**验证：** 相对链接可打开；`summary.md` 与 `spec.md` 术语一致
**覆盖：** 文档交付

### T8 [verify] 全量验证

- [x] `cd RouteME/frontend; npm run build`
- [x] `cd RouteME/frontend; npm test`
- [x] 启动后端与前端，浏览器核对首页 / 身份门 / 详情 / 我的旅行 / 聊天 / 体验页，浅色与深色各一次。

**验证：** 上述命令全绿；截图或浏览器检查记录进入验证报告
**覆盖：** 全部验收场景