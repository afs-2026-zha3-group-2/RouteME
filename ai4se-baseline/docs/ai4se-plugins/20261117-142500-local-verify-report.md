# Local verify report — refine-detail-companions（P4 / G2 输入）

- **Change:** `refine-detail-companions`（REQ-020 灵感详情页同行者卡片化）
- **Branch:** `feature/refine-detail-companions`（P3 提交 `02179bb`，基线 `6f9cb46`）
- **日期:** 2026-11-17 ｜ **记录人:** Lewis Liu（当前开发者）
- **Environment:** Windows 11；Node v24.18.0；OpenJDK 21.0.11；后端 `localhost:8083`（独立 worktree 库 `SqlLite/routeme-companions-e2e.db` / `routeme-companions-e2e2.db`，Flyway V1–V17 重建）；前端 dev `localhost:5176`（`ROUTEME_API_TARGET=http://localhost:8083`）；Playwright Chromium。主工作区 8080 / 5173 的服务未触碰。

## 1. 命令与结果

| 层 | 命令（工作目录） | 结果 |
|---|---|---|
| 规格 | `openspec validate refine-detail-companions --strict`（ai4se-baseline/） | `Change 'refine-detail-companions' is valid` |
| 前端单测 | `npm test`（frontend/） | **36 files / 255 tests passed**（新增 `trips/companions.test.ts` 6 条） |
| 前端类型 | `npm run typecheck`（frontend/） | 0 errors |
| 前端构建 | `npm run build`（frontend/） | 成功（1.50s）；仅既有主 chunk >500 kB 警告 |
| 后端回归 | `.\mvnw.cmd -B -o clean test`（backend/） | **248 tests / 0 failures / 0 skipped**，BUILD SUCCESS |
| E2E 新增 + 既有 | `npx playwright test tests/detail-companions.spec.ts tests/chat-entry.spec.ts`（e2e/，`ROUTEME_E2E_BASE_URL=http://localhost:5176`） | **8 passed**（新增 7 + `chat-entry` 1） |
| 原型走查 | Playwright 截图 `docs/preview/req020-prototype-trip-{1440,390}.png` | 1440 / 390 均正确：同行者卡与发布者卡同构、发布者不重复、聊天按钮独立、无横向溢出 |

## 2. Red → Green（TDD / ATDD 证据）

| 阶段 | 观察 |
|---|---|
| Red A（E2E） | 首次运行 `detail-companions.spec.ts`：6 条 UI 用例失败，`.detail-companions` / `.companion-card` 不存在 |
| Red B（E2E） | `chat-entry.spec.ts` 改为 `.detail-companions` 后定位失败（同行者列表仍是 `ul.detail-participants`） |
| Red C（单测） | `npm test -- companions` → `Failed to resolve import "./companions"`，1 file failed |
| Guard（A1） | `keeps the participants payload unchanged` 首次运行即绿（`participants` 仍含发布者与完整字段），守住零契约 Non-goal |
| Green | 原型 → `companions.ts` → `CompanionCard.tsx` → `TripDetailPage` → `styles.css` 后，上述 8 条全部通过（29.6s） |

## 3. 验收场景 → 用例对照

| Delta 场景 | 用例 | 结果 |
|---|---|---|
| 查看行程详情 / 资料卡展示 / 发布者不重复 / 人数与排序 | `shows companion cards and keeps the publisher out of the list` | Pass |
| 字段回退 | `falls back to job or nickname when profile fields are missing`（周野 → 职业；注册的稀疏用户 → 仅昵称） | Pass |
| 空态 | `renders a readable empty state when only the publisher joined` | Pass |
| 打开公开资料 | `opens a companion profile without leaving the detail page` | Pass |
| 聊天入口按资格 | `shows the chat entry to the publisher and companions but not to outsiders` | Pass |
| 窄屏与双主题 | `keeps companion cards inside the viewport in both themes`（1440/1024/768/390 × 浅/深） | Pass |
| 人数口径 / 零契约反向验证 | `keeps the participants payload unchanged for the detail page`（A1） | Pass |
| 基线 3 条（状态 / 申请入口 / 分享区） | 既有 `trips.spec.ts` / `companions.spec.ts` / `experiences.spec.ts` | 见 §4 |

## 4. 回归结果与失败归因

批量回归（`trips` + `companions` + `profiles` + `mine` + `experiences` + 本 change 两条）在同一库上：**52 passed / 16 failed**。逐项归因：

| 失败组 | 数量 | 归因与证据 |
|---|---|---|
| `profiles.spec.ts` | 4 | 同批次前序 `companions.spec.ts` 以周野（id 4）反复申请并接受，统计「参与同行」从 0 累积到 4；**单独在 fresh 库运行 `profiles.spec.ts` → 8/8 Pass** |
| `trips.spec.ts` 地图 / 发布 | 11 | 与本次改动无关的环境问题：发布/地图用例依赖高德 JS API 与后端 Web 服务 Key（`backend/amap-local.yml` 缺失）及种子日期（2026-11-16 等已翻篇）。**在基线 `6f9cb46` 临时 worktree 上以同一前后端复跑 3 条代表性用例，结果同为失败**，证明为既有环境/数据债务 |
| 其余 | 0 | `mine.spec.ts` / `experiences.spec.ts` / `companions.spec.ts` / 本 change 全绿 |

结论：本 change 影响的用例（同行者区、聊天入口、资料弹窗、分享区、我的旅行）全部通过；16 条失败与代码改动无关，且其中 11 条在基线可复现。

## 5. Non-goals 反向复核

- `git status` / diff 范围：仅 6 个源码/测试/原型文件 + 新增 4 个文件；**无 `backend/**`、无 `openapi.yaml`、无 `db/migration/**`**。
- A1 守卫断言 `participants` 仍含发布者、条数与字段不变。
- 聊天入口条件沿用 `member.id !== currentUser.id && (isPublisher || entry.kind === 'accepted')`，旁观者 0 个入口。

## 6. 验证期修正

| # | 发现 | 处理 |
|---|---|---|
| 1 | E2E 断言周野简介写死种子文案，跨库/跨版本易碎 | 改为断言简介非空，字段回退只认摘要 |
| 2 | 资料弹窗关闭按钮 `getByRole` 命中 2 个（右上 X 与底部「关闭」） | 改用 `.ant-modal-footer button` |
| 3 | 复用的终端 shell 带有 `SERVER_PORT` / `SPRING_DATASOURCE_URL`，导致后端端口与库被改写 | 显式设置 `SERVER_PORT=8083` 与独立库路径后重启；未影响主工作区服务 |
| 4 | 原型详情页容量条被渲染成巨大胶囊 | `.meter` 补 `display: block`（原型 CSS 既有缺陷，非本 change 引入） |

## 7. 数据卫生

- E2E 全程使用独立库 `routeme-companions-e2e.db` / `routeme-companions-e2e2.db`，未写入开发库。
- 为验证地图用例临时从主工作区复制了 `frontend/.env.local`（gitignored），**验证后已删除**，未提交、未记录密钥内容。
- 基线对照用的临时 worktree 已从 git worktree 注册表移除；残留目录因 node_modules 文件被占用未能完全删除，位于 `.worktrees/baseline-6f9cb46`（不在仓库内），可稍后手动清理。

## 8. 待办 / 残余风险

- `styles.css` 是并行修改热点；合并 `origin/main` 后需 grep 抽查 `.detail-companions` / `.companion-card` / `.companion-chat` 仍在。
- 组件层无单测（仓库无 jsdom / Testing Library），卡片渲染回归依赖 E2E。
- 地图/发布类 E2E 在本机缺 `amap-local.yml` 与种子日期翻篇，属既有债务，不阻断本 change。
