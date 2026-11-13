# Knowledge log

Append-only timeline of KB changes.

| date | id | change | author |
|---|---|---|---|
| 2026-11-10 | kb.rules | 初始化 `rules/` MECE 骨架并落地团队 Java Code Style：`java-coding-style`、`java-testing`、`tdd-cycle`、`git-commit-conventions`、`code-review-checklist` | agent |
| 2026-11-10 | kb.index | `_INDEX.md` 补齐 rules 各分类条目与来源链接；`rules/quality/README`、`rules/testing/README` 标注已应用的 java 栈规则 | agent |
| 2026-11-10 | kb.rules.commit | Git 提交规则改为 spec 级：verify 通过后一次、archive 之后一次；冲突处以 `git-commit-conventions` 为准，同步调整 `tdd-cycle`、`code-review-checklist`、`rules/README`、`_INDEX.md` | agent |
| 2026-11-10 | kb.rules.v2 | 吸收团队 v2 规范（`class3-group2-*-20261110-v2`）中未覆盖部分：新增 `naming-conventions`、`web-coding-style`、`web-testing`、`api-contract`、`git-branching-and-pr`、`document-conventions`、`sdd-artifacts` 七条；补齐 `java-coding-style`、`java-testing`、`java-patterns`、`spec-first`、`code-review-checklist`；规则总数 24 → 31 | agent |
| 2026-11-10 | kb.index | `_INDEX.md` 增补上述七条规则条目；`rules/README` 增加团队六条原则与两批规则表 | agent |
| 2026-11-10 | kb.rules.consolidate | 规则目录重构为 `rules/<category>/rules.md` 单文件并全中文；`_INDEX.md` 改为每分类一行、`rules/_INDEX.md` 改为规则内锚点表；`rules/README.md` 与 `_SCHEMA.md` 中文化；修正规则总数口径为 24 条（31 是原文件数） | agent |
| 2026-11-11 | kb.rules.package-structure | 新增 `package-structure` 规则（标准分层包分类与依赖方向），衔接 `java-patterns` / `java-coding-style`；`architecture/README.md` 补 Declared layers；规则总数 24→25；首次建立 `.qoder/rules/ai4se` 投影 | agent |
| 2026-11-11 | kb.rules.package-structure.v2 | 参照阿里巴巴开发手册扩展为完整应用分层（Manager 可选层、DO/DTO/BO/Query/VO 概念映射、分层异常职责、前端目录层映射、仓库级结构）；适用栈扩为 java,react,typescript；规则总数不变 25 | agent |
| 2026-11-11 | kb.rules.layout.staffing | 后端实际布局切换为 `staffing/<layer>` 全局按层（65 个 Java 文件搬移，`mvnw clean test` 49 项通过）；同步 `package-structure`、`java-coding-style`、`code-review-checklist`、`architecture/README` 与仓库级结构；新增 constant/config 层语义 | agent |
| 2026-11-11 | kb.architecture.topology-domain.vocabulary | `architecture/README.md` 补应用拓扑（Spring Boot 4.1 / Java 21、H2 + Flyway、`X-User-Id` stub、服务端可见性、名单读取端口与 HTTP 面）；`domain/README.md` 补上下文地图、术语表（含 wire 值）与不变量，`domain/shared` 改为指向唯一术语表；`scripts/verify-links.sh` 由占位改为复用 `portability.test.mjs` 的 Markdown 链接检查 | agent |
| 2026-11-11 | kb.operations.frontend-toolchain | 新增前端工具链基线（Vite 8/Rolldown、plugin-react 6、vitest 5，esbuild 已退出依赖树）与 `Cannot read directory ... Access is denied` 故障的排查顺序；登记不得回退 Vite 7 + esbuild；build/test/dev 三项为验收口径 | agent |
| 2026-11-11 | kb.domain.candidate-scoring | `domain/README.md` 补候选池、筛选、推荐与通知上下文，新增候选人/复审状态/跨角色补位/评分/阈值/快照/推荐状态/释放申请/通知术语与不变量，来源扩展到 B/C/D Delta | agent |
| 2026-11-11 | kb.interfaces.notification | `interfaces/README.md` 补 REST 能力分组与邮件通知契约：七类通知的收件人、必含 payload、`sent`/`failed` 语义、失败不阻断与“邮件不含评分”约束 | agent |
| 2026-11-11 | kb.operations.notification | `operations/README.md` 补 `MailGateway` 适配、失败记录与重试、复审提醒扫描与周期幂等、演示数据 V5/V6 说明 | agent |
| 2026-11-11 | kb.align.code-structure | 按当前代码对齐规范：architecture 拓扑补 `V1`-`V6`、`DatabaseRosterSummaryService`、`MailGateway`/`LoggingMailGateway`、26 个端点、前端与 e2e 已落地；package-structure/java-patterns 补端口命名（`XxxGateway`、`DatabaseXxxService`）并收紧 manager 触发条件；java-coding-style 修正测试放置（HTTP 接口测试统一 `staffing/controller`）；web-coding-style 补 `route.ts` 与依赖基线指针；code-review-checklist 增分层归属与测试放置检查；operations 补后端运行与验证命令 | agent |
| 2026-11-11 | kb.archive.a-b-c-d | A/B/C/D 四个 change 归档合并：新建 `openspec/specs/{demand-management,roster-and-gap,candidate-profile,candidate-screening,confirmation-record,notification,recommendation-review}` 共 7 个 Living Spec；`scripts/kb-lint.sh` 由占位改为可用的索引编译器（校验 + 编译 `_INDEX.md`、`rules/_INDEX.md`）；G2（VL=Jay）与 G3（SA=Jay）均记录 Pass | agent |
| 2026-11-11 | kb.report.headcount | `domain/README.md` 补人员统计报表上下文、术语与不变量；`interfaces/README.md` 补 `GET /reports/headcount` 与响应契约；`architecture/README.md` 端点计数 26→27、前端 `reports/` 与 E2E 覆盖；来源扩展至 REQ-010 与 change F Delta | agent |
| 2026-11-12 | kb.rules.evolve-adopt | 采纳 change I evolve 提案（用户弹窗批准）：EV-R-1 → `web-coding-style`（同步替换表单按钮的点击处理器 MUST preventDefault）、EV-R-2 → `web-testing`（新记录先筛选再断言、弹出菜单禁用 scroll 关闭）、EV-H-1 → `spec-first`（归档先提交再跑 git ls-files 类检查）；规则总数不变 25 | agent |
| 2026-11-12 | kb.architecture.design-tokens | `architecture/README.md` 新增设计令牌对照表（EV-R-3 采纳）：CSS 变量 ↔ 取值 ↔ Living Spec 口径三方映射（颜色/间距/圆角/动效/断点），明确用户规范 > V2 原型的取值权威与三处同批更新约束；来源 REQ-013 / styles.css / ui-experience Living Spec | agent |
| 2026-11-13 | kb.routeme.bootstrap | 新增 RouteME 应用拓扑（Spring Boot 4.1.2 / Java 21、SQLite + Flyway、H2 测试、React 19 + Vite 8 + Ant Design）与本地启动/验证说明；记录根包 `routeme`、单例 `/greeting`、Ant Design 三处例外的来源（`openspec/changes/bootstrap-hello-world/design.md`） | agent |
| 2026-11-13 | kb.rules.consolidate | 规则去重整理（25→23 条）：`layer-boundaries` 并入 `package-structure`、`java-hooks` 并入 `git-commit-conventions`；删除分类级重复检查清单与三处「与 SDD 的接点」；金额字段/术语单点在 `naming-conventions`；`_SCHEMA` 增「单一事实源」分配表。同步 `rules/README`、`rules/_INDEX`、`knowledge/_INDEX`、`architecture/README`（Declared layers 改为指针）、`operations/README`（导入导出与分页细节指向 `interfaces/README`）、`domain/README`（演示数据基线指向 operations） | agent |
