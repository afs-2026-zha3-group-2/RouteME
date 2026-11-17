# Proposal review — add-ai-itinerary

- **Verdict: Pass**（以修复后状态评审）
- **Scope:** focus=proposal（artifact-review-gate 的 Proposal 轮次，含 P1 Delta 草稿结构核对）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-ai-itinerary/proposal.md) + P1 草稿 [`specs/ai-itinerary/spec.md`](../../openspec/changes/add-ai-itinerary/specs/ai-itinerary/spec.md)（8 Requirement / 36 Scenario）+ [`specs/trip-plans/spec.md`](../../openspec/changes/add-ai-itinerary/specs/trip-plans/spec.md)（1 Requirement / 5 Scenario）
- **Supporting inputs:** `docs/sdd/add-ai-itinerary/p0-baseline.md`（G-01~G-07 源码证据）、发起人完整 User Story（AC1–AC18 / DoD / 技术边界 / 建议 UI）、发起人裁决（2026-11-17：Jay 开发、Neal 第二签署人、收编 AMap 在途工作、DeepSeek 后端 OpenAI 兼容代理）、Living `openspec/specs/trip-plans/spec.md`、未归档增量 `refine-trip-map`
- **Evidence:**
  - `openspec validate add-ai-itinerary --strict` → `Change 'add-ai-itinerary' is valid`；`deltaCount: 9`，无 INFO / WARNING（trip-plans 只 ADDED，不触碰未归档 MODIFIED 目标，无归档顺序条件）
  - 规则锚点：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#no-hardcoded-secrets`；`rules/testing/rules.md#web-testing`
  - 契约现状 `openapi.yaml` `version: 0.11.0`、Flyway head `V17`（`V17__meeting_areas.sql` 已进 main）；升版目标 0.12.0 与 V18 号段核对一致，全仓无 `V18__` 预留
  - 后端全仓 grep `openai|dashscope|llm|deepseek|open-meteo` 0 命中（G-01 / G-02 证据）；`savedRoutes.ts` 为 localStorage 快照（G-04 证据）；AMap 基础（`AmapService` / `AmapContainer` / `RouteLayer` / `PlaceSearchBox`）已随 `8fe0a8a`…`b9e4f42` 交付（G-05 基础）
  - `backend/amap-local.yml` 已 gitignore（`git check-ignore` 证实），`ai-local.yml` 沿用同模式符合 `no-hardcoded-secrets`

## Findings

| id | severity | rule | location | issue | result |
|---|---|---|---|---|---|
| F-1 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | proposal What Changes / 决策「天气参与方式」 | 初稿未写明提示词中的天气摘要由谁获取：若由前端传入，「天气实际参与推荐」可被客户端绕过，且与 AC9「系统根据目的地和日期调用 Open-Meteo」的服务端口径不一致 | **已修复**：generate 在后端内按目的地经纬度 + 日期自取天气并注入提示词，随方案返回天气摘要；`GET /api/weather/forecast` 仅供生成前预览与单独重试；Delta 新增场景「生成响应携带真实天气」 |
| F-2 | SUGGESTION | `rules/process/rules.md#spec-first` | proposal 验收信号 5 | 「雨天方案室内占比更高」缺可判定阈值，P2 AC/DoV 复核无法逐条验证 | **已修复**：Delta 场景「雨天推荐室内优先」以降雨概率 ≥60% 为触发口径，室内占比与装备建议可断言；高温 / 低温同理由 AI 输出标记与 Tips 内容断言 |

**Counts:** BLOCKER 0 / WARNING 1（已修复）/ SUGGESTION 1（已修复）→ **Pass**

## 缺口 → 提案覆盖（P0 G-01~G-07）

| 缺口 | 提案承接 | 验收信号 |
|---|---|---|
| G-01 无 AI 入口与服务 | ADDED「AI 行程生成与重新生成」+ 后端 OpenAI 兼容代理 + `#/ai-planner` | 3 / 7 |
| G-02 无天气 | ADDED「真实天气参与推荐」+ Open-Meteo 后端代理 | 5 |
| G-03 无预算口径 | ADDED「预算估算与超预算反馈」 | 6 |
| G-04 保存仅本机 | ADDED「AI 行程快照保存」+ trip-plans「AI 行程保存为旅行计划」+ V18 / 0.12.0 | 8 |
| G-05 地图未接闭环 | ADDED「地图验证与路线同步」+「行程编辑」（复用 AMap 基础） | 4 / 7 |
| G-06 失败无口径 | ADDED「外部服务失败状态」 | 9 |
| G-07 规格权威缺失 | 新能力 `ai-itinerary` ADDED 8 + `trip-plans` ADDED 1 | 10 |

## AC 覆盖（AC1–AC18）

| AC | Delta 承接 | AC | Delta 承接 |
|---|---|---|---|
| AC1 出发地三种方式 | 条件输入（搜索 / 定位 / 点击 3 场景） | AC10 天气注意事项 / 装备 | 真实天气（雨 / 高温 / 低温 3 场景） |
| AC2 目的地两种方式 | 条件输入「搜索或地图点击设置目的地」 | AC11 天气影响推荐 | 真实天气「雨天推荐室内优先」+ 生成提示词注入 |
| AC3 条件可设置 | 条件输入「可选条件可设置」 | AC12 预算参与推荐 | 预算估算 + 生成提示词预算约束 |
| AC4 按钮门控 | 条件输入「生成按钮按必填项门控」 | AC13 AI 估算标注 | 预算估算「预算四项与 AI 估算标注」 |
| AC5 ≥2 POI 完整行程 | AI 生成「生成完整推荐行程」 | AC14 删除 / 更换 / 调序 | 行程编辑 4 场景 |
| AC6 POI 可定位 + Marker | 地图验证「POI 经高德解析后上图」 | AC15 变化后重算 | 地图验证「景点变化后重算」 |
| AC7 高德算路线 / AI 不虚构 | 地图验证「路线数据来自高德」+ AI 生成「AI 不产出地图数据」 | AC16 重新生成 | AI 生成「重新生成基于当前条件」 |
| AC8 编号与列表一致 | 地图验证「POI 经高德解析后上图」 | AC17 保存为行程 | 快照保存 4 场景 + trip-plans 5 场景 |
| AC9 Open-Meteo 按目的地 + 日期 | 真实天气「按目的地与日期获取天气」 | AC18 Loading / Error / Retry | 失败状态 5 场景 |

## 对齐自检复核

| 检查 | 结论 |
|---|---|
| in/out scope 明确且 out 不进入影响面 | Pass（匹配 / 邀请 / 分享 / 实时价格 / 跨城 / 离线 SVG 页变更 / 独立管理页 / P5 均 out） |
| 发起人裁决有落点 | Pass（DeepSeek 代理、key 本地配置不入库、收编 AMap 工作、不归档、每阶段一提交 push 前 pull） |
| capability 粒度 | Pass（`ai-itinerary` 新能力承载 AI 闭环；`trip-plans` 只 ADDED 保存链接行为，不改既有发布 / 详情 Requirement） |
| 技术边界（AI 不虚构地图 / 天气 / 价格） | Pass（坐标 / 路线 / 距离 / 时间归高德；天气归 Open-Meteo 且后端自取；价格恒标「AI 估算」；Delta 有专门场景） |
| 既有行为保留 | Pass（普通发布不受影响场景；离线 SVG 页不改；AMap 基础组件复用不改语义） |
| 验证链路可执行 | Pass（P0 §3 命令均为仓库真实命令；`openspec validate --strict` 已跑通） |
| 安全 | Pass（真实 key 不入仓库：`ai-local.yml` gitignore + 环境变量占位；key 不下发浏览器） |

## Residual risks

- DeepSeek / Open-Meteo / 高德任一上游不可用时，P4 真实服务走查可能降级为替身证据；E2E 口径 P3 定稿，CI 不依赖真实 key。
- AI 给出高德搜不到的 POI 时体验取决于提示词质量与更换交互；P3 设计需给出解析失败率的可接受口径与更换路径。
- 与并行会话共享工作区（`styles.css` / `MapExplorerPage` / `openapi.yaml`），提交只 stage 本 change 路径，push 前 `git pull --rebase`。
- Open-Meteo 预报窗口约 16 天，超窗日期 400 拒绝；故事示例日期 2026-11-21 在窗口内。

## Next remediations（non-Gate）

- P2：`/sdd:delta-craft` AC/DoV 复核 + `/sdd:consistency-lint` + G1（无归档顺序条件）。
- P3：design.md 承载提示词契约 / JSON schema / 错误码表 / 三栏 UI 令牌；atdd / tasks 按 contract → backend → frontend → e2e 分解。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| proposal.md | 工件 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准（WAYNE + Jay）」，授权记录三个签署位；批准范围：本提案与 P1 Delta 草稿（9 Requirement / 41 Scenario）及本评审报告。