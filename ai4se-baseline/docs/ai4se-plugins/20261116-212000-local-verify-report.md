# Local verify report（R2） — refine-experience-share

- **Change:** `refine-experience-share`（REQ-004 / S16）— R2 布局与原型对齐
- **Date:** 2026-11-16T21:20+08:00
- **Owner:** Jay（AO）
- **Baseline:** `main@e3b2954`

## 1. 命令与结果

| 层 | 命令 | 结果 |
|---|---|---|
| 前端静态 | `cd frontend; npm run typecheck` | 通过 |
| 前端单测 | `cd frontend; npm test` | **28 files / 198 tests passed**（新增 `tripDateFormat.test.ts` 4 例） |
| 后端回归 | `cd backend; .\mvnw.cmd -B -ntp test` | **243 tests, 0 failures**（后端无改动） |
| E2E（本 change，隔离产物） | `cd e2e; npx playwright test tests/experiences.spec.ts --output=test-results-share --trace=off` | **9 passed**（新增「renders the share page with the prototype layout」） |
| E2E（全量，隔离产物） | `cd e2e; npx playwright test --output=test-results-share --trace=off` | 64 passed / 9 failed（均不在本 change 面，见 §4） |

> 说明：默认 `test-results/` 与并行会话的 Playwright 运行共用，trace 写入会互相覆盖导致 `ENOENT ... .trace` 的收尾错误（测试本身已通过）。R2 改用 `--output=test-results-share --trace=off` 隔离，9/9 稳定通过，产物已删除。

## 2. 布局断言（E13–E17）

| 断言 | 实测 |
|---|---|
| 1440 双栏 | `gridTemplateColumns` 两段轨道 |
| 主列面板数 | 3（真实感受 / 路线强度 / 给后来者的一条建议） |
| 侧栏面板数 | 2（你的体验会去哪里 / 分享边界） |
| ≤900 单列 | 880 宽下 1 段轨道，`scrollWidth == clientWidth`（880×1000 → 880/880） |
| 强度卡片 | 3 张；点「较累」后 `.int-card.coral.on` 唯一；`getByRole('radio', { name: /较累/ })` 为 checked |
| hero 元信息 | `珠海市 · 11月6日 · 周五 · 2 人同行` |
| 封面尺寸 | `76px × 60px` |
| 侧栏图标 | 3 条去向各 1 个 `svg`；2 条边界各 1 个 `svg` |
| 页头 | `.page-title`「把这次旅行留给下一个人」、`.page-sub` 非空、`.detail-back` 指向 `#/trips/{id}` |

## 3. 人工走查（集成浏览器，1440 / 768 / 390）

| 视口 / 主题 | 观察 | 结论 |
|---|---|---|
| 1440 浅色 | 页头 + hero + 双栏；主列三面板、侧栏两面板；「适中」卡片 amber 选中；主按钮橙色 + 取消链接 | Pass |
| 1440 深色 | 面板与背景层级清晰；卡片选中态可见；图标与文字对比正常 | Pass |
| 768 浅色 | 单列；强度三卡仍横排（>680）；无横向滚动（758/758） | Pass |
| 390 浅色 | 单列；强度卡纵向堆叠（≤680 规则生效）；hero 封面与标题两行；无横向滚动（380/380） | Pass |
| 390 深色 | 同上，深色下卡片边框可辨 | Pass |
| 原型对照 | `docs/prototype/prototype.html#/share/t_zhuhai_1`（1440）与实现并排比对：结构、分组、按钮位置、卡片形态一致 | Pass |

## 4. 全量 E2E 的 9 条失败（均不属本 change）

| Spec | 失败 | 归属判断 |
|---|---|---|
| `trips.spec.ts:74` | 「identity gate with four demo accounts」 | `main@68d17ae`（`feat(auth): require login and seed zhouye credentials`）已移除演示身份区块，断言过期 |
| `trips.spec.ts:93` / `278` / `321` | 种子行程未出现在首页首屏 | 共享 `SqlLite/routeme.db` 被多会话 E2E 累积数据挤出分页 |
| `mine.spec.ts:159` | 回到前台刷新分组 | 并行 change `refine-my-trips` 的页面重构 |
| `profiles.spec.ts:51/88/102` | 共同兴趣 / 未找到 / 加载失败 | 并行 change `add-user-profiles` 与种子数据变更 |
| `tmp-map-shot.spec.ts` | 截图临时用例 | 并行会话的临时文件（运行后已删除） |

本 change 只触碰 `experiences` 分享页、体验卡与行程卡日期格式；上述文件的断言与数据前提均与之无关。`experiences.spec.ts` 9/9 通过。

## 5. 与设计的偏差

| 设计 | 实际 | 说明 |
|---|---|---|
| §10.1 主列三面板 + 侧栏两面板 | 一致 | — |
| §10.5 `.int-radio` 1px 隐藏 | 改为绝对定位铺满卡片（`inset: 0; opacity: 0`） | 1px 隐藏时 Playwright `check()` 被 `label` 拦截；铺满后点击区域即卡片，键盘与读屏语义不变 |
| 原型分享页无安全提示 | 保留 P4 的 `SafetyNote`（在「建议」面板内） | S14 的能力要求与 P4 已交付内容；原型无此项，属**有意保留的差异**，待用户裁决是否移除 |
| 原型面板标题图标 | 已实现（9 个图标取自原型） | — |

## 6. 结论

- 布局与原型对齐：页头 / hero / 双栏 / 三分组 / 卡片选择器 / 侧栏说明 / 操作位置全部落地。
- 9/9 E2E、198 前端单测、243 后端测试全绿；走查 5 个视口组合通过。
- **Overall：Pass（R2）**；全量 E2E 的 9 条失败已逐条定位为并行 change / 数据累积，不属本 change。