# G2 decision — refine-service-close

- **Change id:** `refine-service-close`（REQ-028 / S29 客服会话结束权交由用户，issue #38「客服服务BUG-客服无法结束会话」）
- **Gate:** G2（Verify）
- **Inputs:**
  - 实现：契约 **0.25.0**（`ServiceSessionStatus` 四值、`ServiceSessionSummary.resolved_at`、新增用户 close 与 admin resolve、删除 admin close、概览四桶）＋ **V30**（`resolved_at` / `resolved_by`）＋ 后端四态状态机与发言回迁 ＋ 前端用户三态结束 / 管理端「标记处理完成」/ 筛选 / 概览四段
  - 本地验证：`docs/ai4se-plugins/20261118-120213-local-verify-report.md`（`mvnw verify` 583/583；前端 475/475 + build 9.21s；E2E 14/14；OpenSpec strict valid）
  - 走查：1440 / 1024 / 390 × 浅 / 深共 24 张入 `docs/preview/refine-service-close/`；4 屏均无横向溢出
  - ATDD：`atdd-design.md` U1–U9 / A1–A11 / S1–S11 共 31 行全部落地
  - 任务：`tasks.md` T1–T11 全部完成
- **Findings:**
  - **功能：** 用户在三态（`WAITING` / `HANDLING` / `RESOLVED`）均可「结束会话」并二次确认；客服仅可「标记处理完成」进入 `RESOLVED`；待确认下任一方发言同事务回迁 `HANDLING` 并清空 `resolved_*`；`closed_by` 只记用户；管理端结束按钮与 `/admin/service/sessions/{id}/close` 彻底下线（404 断言 + UI 无按钮）。
  - **契约：** 删除 admin close 属破坏性收敛，P1 已由用户裁决批准；`resolved_by` 只入库不下发；`/service/sessions` 与 `/current` 描述改三态未结束。
  - **概览：** `by_status` 由三键扩四键，`total = Σ` 分桶；P2 Post-G1 addendum 已补 Scenario 并由用户确认。
  - **回归：** 后端全量 583/583；影响面 E2E（`customer-service.spec.ts` / `admin.spec.ts`）14/14；前端 61 files / 475 tests。
  - **验证期修正：** 提示重复与确认按钮定位改为作用域断言；8082 端口被另一 worktree 旧后端双绑，改用 8090 隔离栈；终端残留 `SPRING_DATASOURCE_URL` 清空后复跑；`e2e/npm install` 被企业镜像 `EALLOWREMOTE` 拒绝，改用主工作区已装依赖。
- **Decision:** **Pass with documented debts**
  - 债务 1：全量 E2E 未跑（T10 只要求两条受影响 spec；全量依赖高德 Key 等既有环境债务）。
  - 债务 2：Redocly CLI 本机未安装，OpenAPI 以 `OpenApiTest` 断言为准（CI 不含 Redocly）。
  - 观察项 1：客服卡片头部与聊天头部同句状态提示重复属既有展示结构，本 change 未改。
  - 观察项 2：8082 存在 `add-report-credit-deduction` worktree 遗留旧后端进程，并联验证需避开该端口。
- **Conditions + owners:** 无阻断条件。跟踪项：
  - G1 条件 C1 延续：归档 MUST 排在 `add-admin-console` 之后（owner：Wayne；P5 执行时核）。
  - 后续：`docs/feedback/verification-commands.md` 仍为空模板（owner：Lewis Liu）。
  - 后续：全量 E2E 需在具备高德 Key 的环境补跑（owner：Neal）。
- **Approvers:** VL = Neal；AO = Lewis Liu；IO = WAYNE（沿用 G1）；SA = Jacky
- **Timestamp:** 2026-11-18

## 结论

G2 **Pass（附记录债务）**。本记录不替代 G3；按用户当次要求**不执行 P5、不归档** `refine-service-close`，issue #38 的「管理端结束」按钮与接口已删除、结束权归用户。
