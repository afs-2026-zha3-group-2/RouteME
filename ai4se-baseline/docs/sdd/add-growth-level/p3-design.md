# P3 设计记录 — add-growth-level

- **Change：** `add-growth-level`（REQ-031 / S32 用户成长等级 LV1–LV5）｜ **阶段：** P3（原型先行 + ATDD 设计 + 技术设计 + 任务 + 评审）
- **日期：** 2026-11-18 ｜ **记录人：** Jay（AO）
- **基线：** `origin/main@f2bad40`（契约 0.26.0 / 迁移头 `V31__report_credit_deduction.sql`）；P3 收口前合并 `origin/main@5f0ef7d`（清理已下线的离线 SVG 地图与相关样式，未触及本 change 工件）；本 change 落定 **0.27.0 + `V32__add_growth_level.sql`**

## 1. 阶段目标

把 P2 已收敛的 9 Requirement / 41 Scenario 变成可执行的 P4 计划：先按原型加出 6 处展示面并完成四宽度 × 双主题走查，再做 ATDD 分层、技术设计（收口 G1 C1 / C2）、任务清单与对齐自检，最后完成 design / tasks 评审签署。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 原型 | [`growth-level.html`](../../prototype/growth-level.html) | 6 处展示面（个人主页 / 资料弹窗 / 详情发布者区 / 首页行程卡 / 申请者行 / 同行者卡片）+ 设计口径 + 主题切换；断点 1024 / 768 / 390 |
| 走查图 | `docs/preview/add-growth-level/` | 1440 / 1024 / 768 / 390 × 浅 / 深色共 8 图；`scrollWidth == innerWidth` 零横向溢出 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-growth-level/atdd-design.md) | A1–A26 API / E1–E8 E2E / R1–R4 反向 / Defer-UT 列表 / 门禁 / fixtures；NFR 不纳入 |
| 技术设计 | [`design.md`](../../../openspec/changes/add-growth-level/design.md) | D1–D14：两张成长表、等级纯函数、单一 `book` 入口、三事件同事务、每日上限、C1 / C2 收口、契约 0.27.0、前端 6 处接入 |
| 任务清单 | [`tasks.md`](../../../openspec/changes/add-growth-level/tasks.md) | 1.1–1.12（1.1 原型已完成）；覆盖自检 + Alignment self-check 10/10 |
| 设计评审 | [`design-review`](../../reviews/20261118-add-growth-level-design-review.md) | Pass；0 BLOCKER / 0 WARNING / 5 SUGGESTION |
| 任务评审 | [`tasks-review`](../../reviews/20261118-add-growth-level-tasks-review.md) | Pass；0 BLOCKER / 0 WARNING / 5 SUGGESTION |

## 3. 原型先行结论

- **6 处展示面全部覆盖**，其中个人主页与资料弹窗区分「本人（LVn + 当前经验 + 距下一级）」与「他人（仅 LVn）」；同行者卡片给出 LV5 实心「400+ / 已满级」样例。
- **四宽度 × 双主题：** 1440 / 1024 / 768 / 390 与浅 / 深色均无横向溢出；徽标在深色下可读。
- **实现口径：** `.growth-pill` / `.growth-pill.lv5` / `.gp-track` 只用 `styles.css` 令牌；不复制 v1 原型的 mock 数据与演示脚本。
- **截图基线：** `docs/preview/add-growth-level/growth-level-{1440,1024,768,390}-{light,dark}.png`，P4 前端走查对照。

## 4. ATDD 摘要

| 层 | 内容 |
|---|---|
| API（A1–A26） | `GrowthAccountApiTest` / `GrowthLevelApiTest` / `GrowthPublishApiTest` / `GrowthLikeApiTest` / `GrowthDailyCapApiTest` / `GrowthReportApiTest` / `GrowthLedgerApiTest` / `GrowthVisibilityApiTest` / `GrowthConcurrencyTest` |
| E2E（E1–E8） | `growth-level.spec.ts` + `growthSupport.ts`：主页本人 LV3 与 240/300、发布 +10、举报回退、行程卡 / 详情 / 申请者 / 同行者 LVn、他人无经验数字 |
| 反向（R1–R4） | 无经验明细页 / 排行榜 / 通知 / 管理端成长视图；无客户端写入口；不改信用账本；只出现 `LVn` |
| 门禁 | 后端 `.\mvnw.cmd -B verify`；前端 `typecheck` + `test` + `build`；E2E 独立 SQLite + 8081 / 5174；Redocly 0 error；`openspec validate --strict` valid |
| NFR | **不纳入**（用户 2026-11-18 裁决）；P4 仅保留既有 CI 与本地门禁 |

## 5. 设计决策摘要

- **两套账本彻底分离（D1）。** 新建 `user_growth_account` + `growth_exp_ledger`；信用表零改动。
- **等级不落库（D2）。** `levelOf(exp)` 与 `expToNext(exp)` 实时派生；LV5 后经验继续累计、展示 `400+`。
- **单一结算入口（D3）。** `GrowthService.book`：幂等键先查 → 懒建 → 截断 → 写流水 → 乐观条件更新（≤3 次）→ 等式断言。
- **三事件同事务（D4，收口 P1 评审 WARNING）。** 发布 `created = true`、点赞 `created = true`、举报 `RESOLVED`（既有扣信用分之后）；失败回滚业务操作。
- **每日上限（D5）。** `Asia/Shanghai` 自然日，正向实发求和；跨档按剩余额度截断、零实发留流水、不补发；负向不受限。
- **C1 收口（D6）。** 重复处理已成立举报沿用 `ReportNotProcessingException`（409），至多扣一次；E2E 只断言经验不变。
- **C2 收口（D8）。** `/profile` 本人含经验，他人仅 `level`，批量仅 `level`；`@JsonInclude(NON_NULL)`。
- **契约（D7）。** 0.27.0：`/profile` 追加 `growth`；新增 `GET /users/growth?ids=`（上限 50）。
- **迁移（D11）。** `V32__add_growth_level.sql` 建表 + 存量 0 账户回填；不回填历史事件。
- **前端（D10）。** `GrowthBadge` + `growth.ts` 纯函数；6 处接入；列表单次批量读取。

## 6. 对齐自检

- Spec → Tasks：9 / 9 Requirement 均有承接；41 场景按标题归入 1.2–1.10（REQ 编号不入任务正文，满足 `consistency-lint` L-04）。
- ATDD → Tasks：A1–A26、E1–E8、R1–R4 全覆盖；Defer-UT 落 1.4 / 1.5 / 1.8。
- Design → Tasks：D1–D14 均有落点；契约 / 迁移先于业务代码；原型先于前端实现。
- **结论：Alignment self-check 10/10 Pass。**

## 7. 评审摘要

| 工件 | 结论 | 发现 | 签署 |
|---|---|---|---|
| `design.md` + `atdd-design.md` | Pass | S-1 结算失败注入 / S-2 迁移方言 / S-3 满级判断 / S-4 日界与时间格式 / S-5 本人与列表数据源 | Jay + Karena（2026-11-18） |
| `tasks.md` | Pass | S-1 1.5 分批 / S-2 1.9 分批 / S-3 测试库方言 / S-4 R3 由 API 层承接 / S-5 批量端点同构 | Jay + Karena（2026-11-18） |
| 两份评审报告 | Pass | — | WAYNE + Jay（2026-11-18） |

## 8. 流程偏差

- **评审顺序：** design 与 tasks 两份工件与两份评审报告在同一 P3 会话内补齐，未按「一份工件一次拦截」逐次停下；四组签署位已在同一次询问中按矩阵一次问齐（Jay + Karena / WAYNE + Jay），结论与范围见 §7。
- **编号顺延：** 本 change 由 REQ-029 / S30 两次顺延至 **REQ-031 / S32**；P3 工件与评审报告均已使用最终编号。
- **NFR：** 按用户裁决不纳入；`atdd-design.md` §5 与 `tasks.md` 均显式记录。

## 9. 残余风险

- D11 的 SQLite / H2 方言差异；P4 双引擎验证，必要时测试库改用 SQLite 并登记偏差。
- 同事务结算给发布 / 点赞 / 举报增加失败点；P4 回归既有三套件并补失败注入（design S-1）。
- 6 处展示面视觉漂移；P4 按 8 张基线图逐屏走查。
- 契约 0.27.0 / 迁移 V32 仍可能被远端占用；P4 开工前复核。

## 10. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| 设计 / 任务第一签署（当前开发者） | Jay | `design.md`、`atdd-design.md`、`tasks.md` 全文 | 2026-11-18 |
| 设计 / 任务第二签署（非当前开发者且非 WAYNE） | Karena | 同上 | 2026-11-18 |
| 报告签署（WAYNE） | WAYNE | design / tasks 两份评审报告结论 | 2026-11-18 |
| 报告签署（当前开发者） | Jay | 同上 | 2026-11-18 |

## 11. 提交记录

- P3 产物（原型 + 8 图、`atdd-design.md`、`design.md`、`tasks.md`、两份评审报告、本记录、`registry.md` / `docs/sdd/README.md` 状态）随阶段提交 `588ae41` 落盘；随后合并 `origin/main@5f0ef7d`（merge `2a1f347`，清理离线 SVG 地图）并 push 到 `origin/feature/add-growth-level`。

## 12. 下一阶段

- P4 从 `tasks.md` 1.2（契约用例）与 1.3（迁移用例）开始，先红后绿；1.5 / 1.9 按评审建议分批执行。
- P4 收口：1.11 门禁 + `docs/ai4se-plugins/<ts>-local-verify-report.md`（含 13 条验收信号对照）；G2 待 VL Neal。
