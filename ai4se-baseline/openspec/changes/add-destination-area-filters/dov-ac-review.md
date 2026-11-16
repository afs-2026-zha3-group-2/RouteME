# AC / DoV review — add-destination-area-filters

- **Change:** `add-destination-area-filters`（REQ-007；`trip-plans` MODIFIED、`trip-experiences` MODIFIED）
- **Reviewed at:** 2026-11-16（+0800）
- **Inputs:** [`proposal.md`](proposal.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、`requirement-workspace/requirements/REQ-007-destination-area-filters.md`、`requirement-workspace/impact-brief.md` §11、`requirement-workspace/deep-dive.md`（REQ-007 段）
- **基线：** 远程 `main@229411a`；`refine-inspiration-home`、`add-trip-publish`、`add-match-reason`、`add-user-logout` 进行中；`add-paged-lists`、`apply-prototype-visual-design`、`add-user-auth` 已归档。

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | `trip-plans` 3 Requirement / 20 Scenario；`trip-experiences` 1 Requirement / 13 Scenario | 字典/筛选/无搜索/体验视图均有 Given/When/Then |
| AC-2 AC 可观测 | Pass | 列表变化、摘要文案、空态、代码/省名字段、级联选项、体验卡无日期 | 不依赖内部实现细节 |
| AC-3 高风险负向/边界已列出 | Pass | 只选到省、非法代码、起止倒置、无结果、搜索不存在、未映射迁移、港澳台/直辖市 | 服务端拒绝与前端校验均在规格中 |
| AC-4 不是伪装的实现细节 | Pass | 字段名 `destination_code`/`province_code`/`province_name` 属契约；迁移场景不写 V10 | 无表名、无 SQL、无类名；V10 只在 proposal/impact 记录 |
| AC-5 与 REQ-007 §4 对应 | Pass | 见 §需求映射 | 17 条需求场景全部有落点；发布页 #7/#8 归 A |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | proposal `What Changes`/`范围` 与两份 delta 一一对应 | 发布页目的地字段明确归 A；本 change 不修改发布 requirement |
| DoV-2 歧义已解决 | Pass | REQ-007 §8：blocking 10/10 resolved；非阻塞 deferred 有 owner | 无未决 blocking |
| DoV-3 IO/SA 残余风险已记录 | Partial | 见 §残余风险 | 无阻塞项；外部依赖需 owner 推进 |
| DoV-4 未声称完成实现 | Pass | 仅规格与评审；无代码/测试改动声明 | `openspec list` 显示 No tasks，属 P2 正常 |
| DoV-5 可追溯到 proposal / REQ-007 | Pass | 见 §需求映射 | 每条 Requirement 可回溯到 REQ-007 §4 |

## 需求映射

| REQ-007 §4 场景 | Delta Requirement | 说明 |
|---|---|---|
| 1 选择城市后只保留该市行程 | `按目的地与日期筛选行程` 按城市筛选 | code 等值；摘要与清除 |
| 2 必须选到市 | 同上的只选到省不应用筛选 | 只选省不生效 |
| 3 直辖市展示 | `省市二级行政区划字典与目的地代码` 直辖市名称/直辖市级联选项 | 显示"北京市"，不显示"市辖区" |
| 4 港澳台展示 | 同上的港澳台名称 | "香港 · 中西區" |
| 5 省名由后端返回 | 同上的响应返回代码与省名 | `province_code`/`province_name` |
| 6 存量迁移 | 同上的存量行程迁移 | 16 城/别名/种子映射，未映射失败 |
| 7 发布页必须选到市 | **A 的 delta**（add-trip-publish 目的地修订） | 本 change 不覆盖 |
| 8 非法代码拒绝 | **A 的 delta** | 本 change 不覆盖 |
| 9 日期区间交集 | `按目的地与日期筛选行程` 按日期区间筛选 | 交集 |
| 10 "周六"=起止同日 | 同上的选择某个周六 | 单日 |
| 11 起止倒置 | 同上的起止日期倒置 | 自动交换 |
| 12 体验视图日期生效 | `灵感首页的旅行体验视图` 按日期区间筛选体验 | 关联行程交集 |
| 13 体验卡不显示日期 | 同上的体验卡不显示日期 | 明确不显示 |
| 14 兴趣多选 OR | `按目的地与日期筛选行程` 按兴趣标签多选筛选 | OR |
| 15 无结果保留条件 | 同上的无结果保留条件；体验视图体验空态 | 不清空 |
| 16 清除全部 | 同上的清除全部筛选条件 | 恢复默认 |
| 17 搜索框不存在 | `本迭代不提供关键词搜索` + 体验视图无关键词搜索 | 三接口无 q |

## 规格解释裁决

| # | 点 | 裁决 | 落点 |
|---|---|---|---|
| 1 | 发布页目的地字段归属 | 归 `add-trip-publish` 目的地修订；本 change 只提供数据底座（V10/字典/响应字段） | proposal §范围；REQ-007 §交付分工 |
| 2 | 搜索移除的跨 change 影响 | A 的"按标题搜索"场景由本 change 改写；refine 的搜索空态测试交 owner | proposal §问题 3；REQ-007 §5 |
| 3 | 体验卡日期 | 不显示；日期筛选仍生效 | `trip-experiences` 体验卡不显示日期 |
| 4 | 省名格式 | 后端返回展示名（普通省"广东省"，港澳台"香港"/"澳门"），前端不截短 | `trip-plans` 响应返回代码与省名 |
| 5 | 直辖市级联 label | 二级 label 显示"北京市"，不显示"市辖区" | `trip-plans` 直辖市级联选项 |
| 6 | 归档顺序 | `refine-inspiration-home` → 本 change → `add-trip-publish`；只归档本 change | proposal 基线；handoff |

## 残余风险

| 风险 | Owner | 处理 |
|---|---|---|
| `refine-inspiration-home` 未归档（0/19 tasks）且同改两 requirement；其搜索空态 E2E 依赖搜索框 | AO / BA | 由 owner 更新测试并先归档；本 change G1 记为条件 |
| `add-trip-publish` 目的地修订未实现（5 条待完成任务），其 G1/G2 基于修订前范围 | AO / SA | 待本 change 数据底座合入后执行；A 归档前重评 G1/G2 |
| V10 重建 `trip_plans` 时与 `trip_experiences` 外键处理 | Dev | 迁移设计验证，保证体验数据不丢 |
| 匹配打分从名称比较改为 code 比较 | Dev | 补 `add-match-reason` 回归（目的地相同 50 分） |
| 区划数据包 v5 数据约 2019/2020 | Dev | MVP 接受静态字典；后续升级不改代码契约 |
| 搜索移除后 A/refine 的 E2E 需同步 | AO / BA | A 由本 change 改写；refine 交 owner |

## 结论

- AC：5/5 Pass。
- DoV：4 Pass + 1 Partial（外部依赖残余风险，无阻塞）。
- **无 blocking Fail**；G1 可在外部条件（refine 先归档、A 后归档/重评）记录的前提下进入决策。
