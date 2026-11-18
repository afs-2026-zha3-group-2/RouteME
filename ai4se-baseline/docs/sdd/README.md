# SDD 阶段记录（P0–P5）

本目录记录每个 change 在 P0–P5 各阶段的准入证据、产出与**具名签署**。阶段模型与门禁语义来自 `ai4se-baseline/vendor/ai4se-plugins/recipes/p0..p5.md` 与 `docs/knowledge/rules/process/rules.md#spec-first`。

## 记录人姓名规则（强制）

角色名册里 AO 是 **Jay**。但**每次记录阶段产出、每次 approve 签署之前**，执行者（含 AI agent）MUST 先向发起人确认本次的实际开发者，不得因为名册写着 Jay 就直接沿用。

- 只在两个时点强制询问：
  1. **记录阶段产出时** —— P0–P5 记录的「记录人」、`g1/g2/g3-decision.md` 的签署人、`tasks.md` 的 Owner、质量检查报告的 owner 列。
  2. **approve / 签署时** —— G1 / G2 / G3 签署表、任何 approve 动作。
- 询问话术固定为：
  > 这次 change 的当前开发者是谁？本工件的签署人按签署矩阵确定（`proposal` / Delta Spec = WAYNE；`design` / `tasks` = 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员；评审报告 = WAYNE + 当前开发者），请一并给出批准人姓名与时间。
- 拿到回答后才落笔；回答与名册不一致时，以发起人回答为准（名册是常任分工，实际执行人可能轮换）。
- 未拿到回答时 MUST 暂停写记录或加签，不允许用 `AO` / `DEV` / `current developer` 等角色词占位，也不允许默认填 `Jay`。
- 姓名写法：`Jay（AO）`、`Neal（VL）`；同一 change 内写法保持一致。
- 一个 change 只有一个 AO；多人协作由该 AO 在签署表注明协助者，不新增 AO 行。
- 历史记录保持可追溯：已存在的条目不做批量替换；确需更正时由对应责任人自行修改并说明。

## 角色名册

| 角色 | 姓名 | 职责 |
|---|---|---|
| SM | Lewis | 阶段准入与排期确认；P1 范围签字 |
| AO | Jay | 当前 change 的开发负责人；实现、本地验证、阶段记录提交。**每次记录与 approve 前仍须按上节询问本次实际开发者** |
| IO | WAYNE | 需求来源与跨能力影响确认；`proposal` / Delta Spec 的唯一签署人 |
| SA | Jacky、Karena | 规格、设计与验收口径签字（P2 起） |
| VL | Neal | 独立验证签字（P4） |

## 工件签署矩阵（强制，`@rule:artifact-review-gate`）

| 对象 | 签署人 | 签署位 |
|---|---|---|
| `proposal.md` | WAYNE | 1 |
| `specs/<capability>/spec.md`（Delta Spec） | WAYNE | 1 |
| `design.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员 | 2 |
| `tasks.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员 | 2 |
| `docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md` | WAYNE + 当前开发者 | 2 |
| `docs/reviews/<yyyymmdd>-<change-id>-all-specs-review.md` | WAYNE + 当前开发者 | 2 |

- 除 WAYNE 外的第二签署人候选：Jay / Lewis / Jacky / Karena / Neal；不得与当前开发者同一人。
- 每份工件写完、评审报告落盘后，执行者 MUST 停下向上述签署人发问，一次问齐该工件的全部签署位；签署位缺一视为未批准。
- 权威口径见 `@rule:artifact-review-gate`（`docs/knowledge/rules/process/rules.md#artifact-review-gate`）；本节是阶段执行清单。

## 阶段与产出

| 阶段 | 目标 | 关键产出 | 记录位置 |
|---|---|---|---|
| P0 | 项目基线可用 | 规格树、规则、知识库、CI 管道现状核对（`p0.md` 清单） | `docs/sdd/<change-id>/p0-baseline.md` |
| P1 | 模糊意图 → 可判定提案 | 需求/故事映射、影响面、`proposal.md` + 提案评审报告 | `docs/sdd/<change-id>/p1-intent.md` |
| P2 | 提案 → 增量规格（G1） | Delta Spec、AC/DoV 复核、`g1-decision.md` + 规格评审报告 | `docs/sdd/<change-id>/p2-spec.md` |
| P3 | 规格 → 设计与可执行任务 | `design.md`、`atdd-design.md`、`tasks.md`、一致性检查 + 设计与任务评审报告 | `docs/sdd/<change-id>/p3-design.md` |
| P4 | 实现 → 本地验证 → CI（G2） | 代码与测试、本地验证报告、`g2-decision.md` | `docs/sdd/<change-id>/p4-verify.md` |
| P5 | 合并与归档（G3） | `summary.md`、living spec 合并、知识库登记 | 归档后写入 `changes/archive/` |

### 工件评审门禁（强制，`@rule:artifact-review-gate`）

每写完一份工件都必须先评审、再按「工件签署矩阵」签齐，然后才能进入下一步：

| 工件 | 评审报告路径 | 工件签署人 | 报告签署人 |
|---|---|---|---|
| `proposal.md` | `docs/reviews/<yyyymmdd>-<change-id>-proposal-review.md` | WAYNE | WAYNE + 当前开发者 |
| `specs/<capability>/spec.md`（Delta） | `docs/reviews/<yyyymmdd>-<change-id>-spec-review.md` | WAYNE | WAYNE + 当前开发者 |
| `design.md` | `docs/reviews/<yyyymmdd>-<change-id>-design-review.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员 | WAYNE + 当前开发者 |
| `tasks.md` | `docs/reviews/<yyyymmdd>-<change-id>-tasks-review.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员 | WAYNE + 当前开发者 |

1. 工件写完**同一个回合内**调用 `all-specs-review` 技能，不得跳步写下一份工件。
2. 报告写进上表路径；修改后重评不得覆盖旧报告（同日加序号 `-review-2.md`）。
3. 报告写完后**必须停下**，按上表一次询问该工件的全部签署人：本次结论为 `<Pass/Partial/Fail>`，工件与报告分别由谁签、第二签署人是谁、批准时间是什么。
4. 只有矩阵要求的签署位**全部明确 approve** 才继续；任一签署位缺失、未回复或回复含糊视为未批准。
5. 结论为 `Fail` 时先修复并重评至至少 `Partial`，再请求签署。
6. 签署记录逐条追加在报告的「签署记录」小节，用「对象 + 签署位 / 批准人 / 批准时间」区分：`proposal`、`spec` 各 3 条（工件 1 + 报告 2），`design`、`tasks` 各 4 条（工件 2 + 报告 2）；不改写评审结论；姓名规则同上节。

- `all-specs-review` 的 `Pass` 不是 G1/G2/G3 通过，它只出评审意见。
- 只改错字/链接/格式且不改语义的修订，可复用上一份 `Pass` 报告并追加「变更摘要」一行。

## 提交约定（本目录的约定）

- 一个 change 的每个阶段对应**一次提交**，提交信息为 `<type>(p<N>): <change-id> <description>`。
  - 该写法是 `@rule:git-commit-conventions`（只允许 `verify` / `archive` 两个 stage）的本地扩展：本仓库按阶段留痕，因此 stage 位使用 `p0`–`p4`。`change-id` 仍出现在每条信息里，可从提交反查规格。
  - P4 仍承担该 change 的 verify 语义：代码、测试、验证证据与 G2 签署在同一条链路内。
- 每个阶段提交必须包含该阶段的签署记录；签署缺失视为阶段未完成。
- 提交前必须满足「记录人姓名规则」：记录人、Owner、签署人已确认为当次实际开发人。
- 未归档的 change 不产生 P5 提交；P5 记录随归档提交写入 `changes/archive/`。

## 变更索引

阶段记录按 `<change-id>` 分目录保存；表中链接指向各阶段记录（提交哈希写在记录的「阶段提交链」小节）。

> `REQ-014-reference-publish` 不是 OpenSpec change：它是 S17「参考此行程发布」按「已验证交付」收口的 P1 记录目录（复用已归档的 `add-trip-experiences`），P2–P5 不适用。P2 已按准入判定留档（无 Delta Spec、无 G1、不主张 Pass），见 [p2-spec.md](REQ-014-reference-publish/p2-spec.md) §2 / §5；P3 交付现状设计确认与 [UI 预览](REQ-014-reference-publish/preview/reference-publish.html)，见 [p3-design.md](REQ-014-reference-publish/p3-design.md) §4–§6；P4 只做行为复核（E2E 6/6、前端单测 137/137），无代码 diff、无 G2，见 [p4-verify.md](REQ-014-reference-publish/p4-verify.md)。

| change-id | 能力 | 故事 | P0 | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|---|---|---|
| `add-trip-publish` | `trip-plans`（MODIFIED） | S06 发布旅行计划（issue #8） | [p0](add-trip-publish/p0-baseline.md) | [p1](add-trip-publish/p1-intent.md) | [p2](add-trip-publish/p2-spec.md) | [p3](add-trip-publish/p3-design.md) | [p4](add-trip-publish/p4-verify.md) | 暂不执行（按要求不归档） |
| `add-match-reason` | `trip-companions`（MODIFIED） | S07 匹配原因提示（issue #9） | [p0](add-match-reason/p0-baseline.md) | [p1](add-match-reason/p1-intent.md) | [p2](add-match-reason/p2-spec.md) | [p3](add-match-reason/p3-design.md) | [p4](add-match-reason/p4-verify.md) | 暂不执行（按要求不归档） |
| `add-destination-area-filters` | `trip-plans` + `trip-experiences`（MODIFIED） | REQ-007 灵感首页目的地/日期筛选 | [p0](add-destination-area-filters/p0-baseline.md) | [p1](add-destination-area-filters/p1-intent.md) | [p2](add-destination-area-filters/p2-spec.md) | [p3](add-destination-area-filters/p3-design.md) | 待 P4 | 暂不执行（依赖 `refine-inspiration-home` 先归档） |
| `refine-trip-application` | `trip-companions`（MODIFIED） | REQ-010 / S08 提交同行申请 | — | [p1](refine-trip-application/p1-intent.md) | [p2](refine-trip-application/p2-spec.md) | [p3](refine-trip-application/p3-design.md) | [p4](refine-trip-application/p4-verify.md) | 待 P5 |
| `refine-safety-report` | `trip-companions`（REMOVED + ADDED） | REQ-012 / S14 同行举报入口与回执 | — | [p1](refine-safety-report/p1-intent.md) | [p2](refine-safety-report/p2-spec.md) | [p3](refine-safety-report/p3-design.md) | [p4](refine-safety-report/p4-verify.md)（G2 待 VL Neal） | 暂不执行 |
| `add-trip-completion` | `trip-plans` + `trip-companions`（MODIFIED / ADDED） | REQ-011 / S15 结束行程 | — | [p1](add-trip-completion/p1-intent.md) | [p2](add-trip-completion/p2-spec.md) | [p3](add-trip-completion/p3-design.md) | [p4](add-trip-completion/p4-verify.md) | 待 P5 |
| `REQ-014-reference-publish` | `trip-experiences`（已交付，只读引用） | REQ-014 / S17 参考此行程发布 | — | [p1](REQ-014-reference-publish/p1-intent.md) | [不适用](REQ-014-reference-publish/p2-spec.md)（无 Delta / 无 G1） | [不适用](REQ-014-reference-publish/p3-design.md)（现状确认 + [UI 预览](REQ-014-reference-publish/preview/reference-publish.html)） | [p4](REQ-014-reference-publish/p4-verify.md)（行为复核 Pass；无 G2） | 不适用（复用 `add-trip-experiences`） |
| `refine-my-trips` | `trip-companions`（MODIFIED） | S11 我的旅行（issue #13） | [p0](refine-my-trips/p0-baseline.md) | [p1](refine-my-trips/p1-intent.md) | [p2](refine-my-trips/p2-spec.md) | [p3](refine-my-trips/p3-design.md) | [p4](refine-my-trips/p4-verify.md) | 暂不执行（按要求不归档） |
| `refine-experience-share` | `trip-experiences`（MODIFIED） | REQ-004 / S16 发布游后体验（issue #18） | [p0](refine-experience-share/p0-baseline.md) | [p1](refine-experience-share/p1-intent.md) | [p2](refine-experience-share/p2-spec.md) | [p3](refine-experience-share/p3-design.md) | [p4](refine-experience-share/p4-verify.md) | 暂不执行（按要求不归档） |
| `refine-trip-map` | `trip-plans`（MODIFIED + ADDED） | REQ-016 地图导航风重做 / 详情路线地图 / 多集合区域 | [p0](refine-trip-map/p0-baseline.md) | [p1](refine-trip-map/p1-intent.md) | [p2](refine-trip-map/p2-spec.md) | [p3](refine-trip-map/p3-design.md) | [p4](refine-trip-map/p4-verify.md) | 暂不执行（按要求不归档） |
| `add-ai-itinerary` | `ai-itinerary`（ADDED）+ `trip-plans`（ADDED） | REQ-017 AI 智能行程推荐（地点 / 预算 / 天气） | [p0](add-ai-itinerary/p0-baseline.md) | [p1](add-ai-itinerary/p1-intent.md) | [p2](add-ai-itinerary/p2-spec.md) | [p3](add-ai-itinerary/p3-design.md) | [p4](add-ai-itinerary/p4-verify.md)（G2 Pass，Neal 签 VL；天气契约并入 `add-trip-weather`，0.17.0） | 暂不执行（按要求不归档） |
| `add-experience-photos` | `trip-experiences`（ADDED + MODIFIED） | REQ-018 游后体验图片上传（S16 增强项） | —（沿用 `main@c57a70f` 基线） | [p1](add-experience-photos/p1-intent.md) | [p2](add-experience-photos/p2-spec.md)（G1 Pass + C1） | [p3](add-experience-photos/p3-design.md)（ATDD / Design / Tasks，对齐自检 Pass） | [p4](add-experience-photos/p4-apply.md)（Pass with documented debt） | 暂不执行（归档需排在 `refine-experience-share` 之后） |
| `add-credit-account` | `user-credit`（ADDED） | REQ-019 / S19 信用分账户与等级展示（编号由 REQ-018 顺延） | — | [p1](add-credit-account/p1-intent.md) | [p2](add-credit-account/p2-spec.md)（G1 Pass） | [p3](add-credit-account/p3-design.md)（Pass） | [p4](add-credit-account/p4-verify.md)（本地 Pass；G2 待 Neal） | 暂不执行（按要求不归档） |
| `refine-detail-companions` | `trip-plans`（MODIFIED） | REQ-020 灵感详情页同行者卡片化 | —（零后端 / 契约 / 迁移，跳过 P0） | [p1](refine-detail-companions/p1-intent.md)（Pass，proposal + Delta 已签） | [p2](refine-detail-companions/p2-spec.md)（G1 Pass） | [p3](refine-detail-companions/p3-design.md)（Pass，design + tasks 已签） | [p4](refine-detail-companions/p4-verify.md)（G2 Pass，Neal 签 VL；已合并 main） | 暂不执行（按要求不归档） |
| `add-trip-cancel` | `trip-cancellation`（ADDED） | REQ-021 / S21 issue #28 取消行程（编号顺延：REQ-019 / 020 已被占用） | [p0](add-trip-cancel/p0-baseline.md) | [p1](add-trip-cancel/p1-intent.md) | [p2](add-trip-cancel/p2-spec.md) | [p3](add-trip-cancel/p3-design.md) | [p4](add-trip-cancel/p4-verify.md) | 待 P5 |
| `add-experience-like-credit` | `trip-experiences` + `user-credit`（ADDED） | REQ-023 issue #30 旅行体验获赞增加信用分（信用系统迭代 2 / Story 3；原 REQ-022，合并 main 后顺延） | —（原基线 `origin/main@64b38da`；合并 `origin/main@b50e416` 后顺延，跳过 P0） | [p1](add-experience-like-credit/p1-intent.md)（Pass；proposal 评审 Partial + spec Pass，签署 7/7） | [p2](add-experience-like-credit/p2-spec.md)（Delta + AC/DoV Pass + lint Pass；G1 Pass，IO=Wanye / SA=Jacky） | [p3](add-experience-like-credit/p3-design.md)（Pass；ATDD 27 场景 / design D1–D16 / tasks T0–T11 对齐自检 Pass；design + tasks 评审 Pass，签署 8/8；契约 0.18.0 + V24） | [p4](add-experience-like-credit/p4-verify.md)（Pass；后端 342 / 前端 306 / 受影响 E2E 12 全绿；本地验证 Pass `20261117-171312-local-verify-report.md`；按用户指示直接合并 main，G2 待 Neal） | 暂不执行（归档需排在 `add-credit-account` / `add-experience-photos` 等之后） |
| `add-trip-weather` | `trip-weather`（ADDED） | REQ-022 目的地天气与出行提醒（迭代 2 / P1） | [p0](add-trip-weather/p0-baseline.md) | [p1](add-trip-weather/p1-intent.md) | [p2](add-trip-weather/p2-spec.md) | [p3](add-trip-weather/p3-design.md) | [p4](add-trip-weather/p4-verify.md) | 暂不执行（按要求不归档） |
| `add-credit-recovery` | `user-credit`（ADDED） | REQ-027 / S28 issue #32 安全学习恢复信用分（信用系统迭代 4；原 REQ-022 / S22，合并 main 后四次顺延） | —（原基线 `main@0524109`；合并 `origin/main@0f4ab14` 后四次顺延，跳过 P0） | [p1](add-credit-recovery/p1-intent.md) | [p2](add-credit-recovery/p2-spec.md)（G1 Pass） | [p3](add-credit-recovery/p3-design.md)（Pass，四份工件评审 Pass；契约 0.23.0 + `V27__add_credit_learning.sql`） | [p4](add-credit-recovery/p4-apply.md)（Pass；local-verify Pass；四次合并门禁与 E2E 归因见 §8，G2 / E3 待） | 暂不执行（归档须排在 `add-credit-account` 之后） |
| `add-credit-exit-restriction` | `credit-enforcement`（ADDED） | REQ-025 / S25 退出同行扣减信用分 + S26 低信用分自动限制账号（起草 REQ-022，合并时两次顺延） | [p0](add-credit-exit-restriction/p0-baseline.md) | [p1](add-credit-exit-restriction/p1-intent.md) | [p2](add-credit-exit-restriction/p2-spec.md)（G1 Pass） | [p3](add-credit-exit-restriction/p3-design.md)（ATDD / Design / Tasks / 原型） | [p4](add-credit-exit-restriction/p4-verify.md)（Pass with documented debt；G2 = Neal） | 暂不执行（按要求不归档） |
| `add-traveler-recommendation` | `trip-recommendations`（ADDED） | REQ-024 同行者推荐（迭代 2 / P0 / 5 点） | [p0](add-traveler-recommendation/p0-baseline.md) | [p1](add-traveler-recommendation/p1-intent.md) | [p2](add-traveler-recommendation/p2-spec.md) | [p3](add-traveler-recommendation/p3-design.md) | [p4](add-traveler-recommendation/p4-verify.md) | 暂不执行（按要求不归档） |
| `add-admin-dashboard` | `admin-dashboard`（ADDED） | REQ-026 / S27 管理后台概览统计（管理后台迭代 4） | —（只读聚合，无迁移） | [p1](add-admin-dashboard/p1-intent.md) | [p2](add-admin-dashboard/p2-spec.md)（G1 Pass） | [p3](add-admin-dashboard/p3-design.md)（Pass） | [p4](add-admin-dashboard/p4-verify.md)（本地 Pass；G2 待签署） | 暂不执行（按要求不归档） |
| `refine-user-support-entry` | `user-support`（ADDED） | REQ-018 客服能力的界面调整（用户侧独立客服入口；帮助与反馈已下线） | —（前端界面调整，零后端 / 契约 / 迁移） | —（无新增需求条目） | — | — | [p4](refine-user-support-entry/p4-apply.md)（Pass；类型检查 + 446 tests + build + E2E 19/19；§7 记录帮助与反馈下线；G2 待） | 暂不执行（归档需排在 `add-admin-console` 之后） |
| `refine-service-workbench-live` | `customer-service`（ADDED） | REQ-018 客服能力的实时可见性（队列 3 秒轮询 / 页签待接入徽标 / 等待横幅） | —（前端轮询与提示，零后端 / 契约 / 迁移） | —（无新增需求条目） | — | — | [p4](refine-service-workbench-live/p4-apply.md)（Pass；类型检查 + 446 tests + build + E2E 12/12；G2 待） | 暂不执行（归档需排在 `add-admin-console` 之后） |
| `add-admin-experience-moderation` | `admin-console`（ADDED） | REQ-018 管理员删除任意旅行灵感 + 管理员前台导航范围 | —（无迁移；仅清理既有表数据） | —（无新增需求条目） | — | — | [p4](add-admin-experience-moderation/p4-apply.md)（Pass；后端 601/601 + 前端 446 + E2E 24/24；G2 待） | 暂不执行（归档需排在 `add-admin-console` 之后） |
| `refine-service-inbox-unread` | `customer-service`（ADDED） | REQ-018 客服队列新消息置顶 + 气泡提示；移除刷新提示语 | —（纯前端，零后端 / 契约 / 迁移） | —（无新增需求条目） | — | — | [p4](refine-service-inbox-unread/p4-apply.md)（Pass；E2E 13/13；G2 待） | 暂不执行（归档需排在 `add-admin-console` 之后） |
