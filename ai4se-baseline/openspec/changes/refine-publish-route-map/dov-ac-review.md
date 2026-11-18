# AC / DoV review — refine-publish-route-map

- **Change:** `refine-publish-route-map`
- **Phase:** `p2`（Delta Spec 复核，G1 输入）
- **Delta 路径:** `openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md`（MODIFIED：1 Requirement / 18 Scenario）
- **Requirement 来源:** `requirement-workspace/requirements/REQ-027-publish-route-map.md` §4（S28-1 ~ S28-11，另沿用基线 7 场景）
- **Proposal:** `openspec/changes/refine-publish-route-map/proposal.md`（D1–D9 / AC-1 ~ AC-10）
- **Timestamp:** 2026-11-18
- **Artifact level:** 2（`proposal.md` + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec validate refine-publish-route-map --strict` → `Change 'refine-publish-route-map' is valid`；`openspec show refine-publish-route-map --json --deltas-only` → `deltaCount: 1`，`operation: MODIFIED`

## Verdict

**AC 4/4 Pass ｜ DoV 5/5 Pass → G1-ready（等签署）**

## AC 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少一个可测 AC | Pass | 唯一 Requirement 含 18 个 Scenario（基线 7 + 新增 11） | 录入、排序、上限、模式切换、公共交通、降级、文案边界、提交字段、占位名、预填、响应式均有独立场景 |
| AC-2 AC 可观察 | Pass | 断言面：`waypoint-panel` / `amap-itinerary-panel` / `amap-route-generate` 三个既有 testid、折线与编号 pin、`amap-route-stats` 的距离与时长、三档文案、请求体字段集合、`#/map/{省}/{市}` 深链、可见提示文本 | 无「好看」「正常工作」类模糊表述；每条 Then 都能落到 DOM、网络请求或路由 |
| AC-3 高风险处有负向 / 边界场景 | Pass | 重复点不重复加入、8 点上限、公共交通规划失败、服务不可用降级、占位名拒绝提交、不出现「步行」与「驾车」、390px 与深色主题 | 覆盖重复、容量、失败、文案串味、脏数据与布局六类风险 |
| AC-4 不把实现细节伪装成 AC | Pass | Delta 不指定组件名、文件名或状态变量；「发布页显示三档 / 探索页保持三档 / 两处不串味」是可观察断言 | P2 已把原文的「编辑器接受 `modes` / `modeLabels`」改写为两端可观察口径；prop 形状留 P3 `design.md` |

## DoV 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致 | Pass | 提案 In scope（D1–D9）→ Delta 1 Requirement；Out of scope 7 条（持久化 / 收藏 / 详情页重算 / 匹配面板 / AI 页 / 探索页缺陷 / 契约迁移）全部无对应 Requirement | 未静默扩到后端、契约或详情页 |
| DoV-2 歧义已列出或解决 | Pass | REQ-027 §5：OQ-1 ~ OQ-7 全部有默认裁决；仅「占位名 UX 细节」「共享件 props 形状」留 P3，owner = Dev | 两条 deferred 均不改变 Delta 的可判定性 |
| DoV-3 角色关注点已记录 | Pass | IO：导航入口移除的可发现性、范围不含探索页缺陷；SA：面板复用边界与两端文案不串味；Dev：`AppShell` / `tripMessages` 并行改动与 E2E 重写 | 见下方「IO / SA 残余关注」 |
| DoV-4 未主张已实现业务 | Pass | P2 无生产代码 / 契约 / 迁移变更；工作区只有 P0–P2 工件 | 实现与原型属 P4 |
| DoV-5 Requirement 可追溯到提案 / 已批准需求 | Pass | 11/11 新增场景映射见下表；基线 7 场景原文保留；无孤儿 Requirement | AC-7（导航）按 D7 由 E2E 覆盖，不写 Delta，理由已写入提案 |

## Requirement 映射（REQ-027 → Delta）

| REQ-027 场景 | Delta Scenario | 提案 AC |
|---|---|---|
| S28-1 在地图上添加途经点并看到路线 | 在地图上添加途经点并看到路线 | AC-1 / AC-2 |
| S28-2 途经点顺序可调整 | 途经点顺序可调整 | AC-3 |
| S28-3 途经点超过上限时被拦截 | 途经点超过上限时被拦截 | AC-2 |
| S28-4 切换出行方式重算路线 | 切换出行方式重算路线 | AC-4 |
| S28-5 公共交通使用目的地城市规划 | 公共交通使用目的地城市规划 | AC-4 |
| S28-6 路线服务不可用时按顺序直线示意 | 路线服务不可用时按顺序直线示意 | AC-5 |
| S28-7 降级提示不暴露实现细节 | 降级提示不暴露实现细节 | AC-5 |
| S28-8 发布只提交地名与出行方式 | 发布只提交地名与出行方式 | AC-6 |
| S28-9 坐标占位名不得进入发布 | 坐标占位名不得进入发布 | AC-10 |
| S28-10 AI 预填路线进入编辑器后可编辑 | AI 预填路线进入编辑器后可编辑 | AC-8 |
| S28-11 窄屏与双主题不溢出 | 窄屏与双主题不溢出 | AC-9 |
| —（导航入口移除，无独立场景） | — | AC-7（D7 + E2E） |

## Living Spec 基线保留

Living Spec `openspec/specs/trip-plans/spec.md`「发布可被他人理解的旅行计划」共 7 个基线场景，脚本比对（忽略空行差异）结果 **7/7 原文保留、0 修改**：

| 基线场景 | 处置 |
|---|---|
| 填写完整必填项后成功发布 | 保留 |
| 选填项可留空 | 保留 |
| 必填项缺失时拒绝发布 | 保留 |
| 日期不合法时拒绝发布 | 保留 |
| 途经点不足两个时拒绝发布 | 保留 |
| 计划人数越界时拒绝发布 | 保留 |
| 预算区间倒置时拒绝发布 | 保留 |

- Requirement 正文第 1 段（标题 / 目的地 / 日期 / 人数 / 预算 / 兴趣 / 选填项）逐字保留；新增 3 段只追加编辑器、出行方式、降级与提交约束。
- **旧行为 → 新行为：** 旧正文只约束「至少两个途经点」，未规定录入方式；新正文追加「地图编辑器录入、按钮触发规划、三档模式、降级口径、占位名禁止」。属**纯追加**，没有删除或改写任何既有约束。
- 这是本 change 唯一的 Living Spec 口径变化面，需 G1 具名确认。

## IO / SA 残余关注

| 关注点 | 归属 | 说明 |
|---|---|---|
| 移除「旅行地图」导航入口 | IO / SA | 页面与 `#/map`、`#/map/{省}`、`#/map/{市}` 保留；可发现性下降属已批准裁决（D3 / D7），G1 确认即可 |
| 共享件的状态归属 | SA / Dev | `MapExplorerPage` 的 `routeRequested` / `waypoints` / `mode` 是否整体搬入共享件，还是仅共享面板；P3 `design.md` 必须先定边界，避免探索页行为漂移 |
| `TravelMode` 与 `TripTravelMode` 类型合并 | Dev | 前者含 `walking`，后者不含；P3 需给出泛型或映射方案，禁止在发布页出现 `walking` 分支 |
| 占位名拦截 UX | SA / Dev | 就地改名 vs 提交兜底；P3 定稿，P4 单测 + E2E 各覆盖一条 |
| `trips.spec.ts` 重写范围 | Dev | 仅重写发布用例中失效的 `china-map` / `city-map` 断言；`map.spec.ts` 的同类断言记既有债务，不扩本 change |

## Next

- 一致性检查：`openspec/changes/refine-publish-route-map/consistency-lint.md`（phase=p2）
- G1：`openspec/changes/refine-publish-route-map/g1-decision.md`（IO + SA 具名签署）