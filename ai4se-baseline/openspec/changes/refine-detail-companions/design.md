# 设计：refine-detail-companions

- **Change：** `refine-detail-companions`（REQ-020，`trip-plans` MODIFIED）
- **输入：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`atdd-design.md`](atdd-design.md)、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)
- **结论：** 纯前端展示层改造。`participants` 已含发布者 + 已接受同行者的完整 `DemoUser`，不需要动后端、契约与迁移；工作集中在详情页同行者区、卡片组件、一条纯函数与样式收敛。

## 关键取舍

### D1 展示范围：只展示同行者（= G1 记录 D1）

| 方案 | 行为 | 结论 |
|---|---|---|
| 后端从 `participants` 去掉发布者 | 会改契约语义、人数口径与既有消费方 | 否决 |
| 前端按 `trip.publisher.id` 过滤 | 零契约变更；人数仍用 `joined_count`（含发布者） | 采用 |

`participants` 是「发布者 + 已接受同行者」的既有口径，详情页发布者卡片已经单独展示。过滤只发生在视图层，`join` 人数、排序与接口响应都不变。

### D2 卡片密度：复用发布者排版类，不复制一套字号

| 方案 | 行为 | 结论 |
|---|---|---|
| 新写一套 `.companion-*` 字号 / 间距 | 与发布者卡片逐渐漂移，双份维护 | 否决 |
| 复用 `.publisher-row / .publisher-body / .publisher-name / .publisher-bio / .publisher-tags` | 密度天然一致；与发布者卡片同源 | 采用 |

新增样式只负责「列表容器 + 卡片壳 + 聊天入口对齐」，不重定义排版。卡片外壳用 `--surface-2` / `--line` / `--r` 等既有令牌，不新增十六进制色值。

### D3 交互：整卡开资料，聊天是兄弟节点

卡片主体是 `<button>`（`aria-label="查看 {昵称} 的资料"` → `openProfile(member.id)`），聊天入口是 `<a>`，两者为兄弟节点而非嵌套——嵌套可聚焦控件会破坏键盘与读屏顺序。聊天入口只在 `member.id !== currentUser.id && (isPublisher || entry.kind === 'accepted')` 时渲染，沿用现状，不扩权。

### D4 逻辑边界：过滤 / 去重 / 保序收进纯函数

新增 `frontend/src/trips/companions.ts`：

```ts
export function tripCompanions(participants: DemoUser[], publisherId: number): DemoUser[]
```

- 过滤发布者；按 `id` 去重（保留首次出现），防后端重复返回导致 React key 冲突；**不排序**，顺序即响应顺序。
- Tab/空态判断不需要额外函数：`companions.length === 0` 直接渲染空态。
- 新增文案 `tripMessages.detailParticipantsEmpty = '还没有其他同行者。'`；既有 `detailParticipantsPending` 不动（不在本 change 范围）。

### D5 样式收敛：删两处旧规则，新样式追加到文件末段

现状 `styles.css` 有三处只服务纯姓名列表的规则：`.detail-stops, .detail-participants` 组合选择器（共享缩进）、`.detail-stops li, .detail-participants li` 组合选择器，以及 `.detail-participants li` / `.detail-participant-chat` 两条独立规则。处理方式：

1. `.detail-stops` 从两处组合选择器中摘出，保留原有列表样式；
2. 删除 `.detail-participants li` 与 `.detail-participant-chat`；
3. 新样式（`.detail-companions`、`.companion-card`、`.companion-card .publisher-button`、`.companion-chat`、`.detail-companions-empty`）追加到 `styles.css` 末段。

理由：该文件多人并行修改、历史上出现过 merge 丢样式；追加式新增 + 明确删除清单，便于合并后 grep 抽查。

### D6 测试分层：纯逻辑单测 + E2E，不引入 Testing Library

| 层 | 落点 |
|---|---|
| 纯逻辑 | `companions.test.ts`（过滤 / 去重 / 保序） |
| 端到端 | `e2e/tests/detail-companions.spec.ts`（卡片、空态、弹窗、聊天资格、人数与排序、窄屏双主题、字段回退） |
| 组件 | 不新增（仓库 `vitest` 为 node 环境、只收 `*.test.ts`，无 Testing Library / jsdom） |

`@rule:web-testing` 的阻断项只要求「纯逻辑有单测」与「界面改动跑通受影响 E2E」，两层即满足；组件层缺口登记为残余风险，不在本 change 引入新测试基础设施。

### D7 原型先行

先改 `docs/prototype/ui.js` 的 `compPanel` 与 `docs/prototype/styles.css`：过滤发起人、卡片化（`host-card` 同构）、空态用既有 `.companions-empty`；确认原型后再落实现，避免实现与设计稿二次返工。原型里 `.companion` 仍被身份切换弹窗复用，不改其定义。

## 风险与例外

- **风险：** `styles.css` 是并行修改热点，合并可能丢新段。缓解：新样式集中在文件末段、删除清单可 grep、合并后抽查关键类。
- **风险：** 无组件测试层。缓解：E2E 覆盖渲染差异（含仅昵称的稀疏用户）；如后续引入 Testing Library，另开基础设施 change。
- **例外：** 已结束行程分享区、申请入口、状态徽标三个基线场景不改代码，仅由既有 E2E 回归覆盖。
- **遗留：** 同行者超过 6 人时的折叠 / 滚动策略未定义（当前数据量级不需要），列入后续观察。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| Delta 场景 | 设计 | 任务 | ATDD |
|---|---|---|---|
| 查看行程详情 | D1 / D2 | T3 T4 | #1 E2E |
| 同行者资料卡展示 | D2 | T3 T4 | #2 E2E |
| 同行者字段回退 | D2 | T3 | #3 E2E |
| 发布者不在同行者列表重复 | D1 | T2 T3 | #4 E2E |
| 没有其他同行者时的空态 | D4 | T3 | #5 E2E |
| 打开同行者公开资料 | D3 | T3 | #6 E2E |
| 同行者卡片聊天入口按资格显示 | D3 | T3 | #7 E2E |
| 同行者人数口径与排序不变 | D1 / D4 | T2 T3 | #8 E2E + A1 |
| 窄屏与双主题不溢出 | D5 | T4 | #9 E2E |
| 状态标识清晰 | 基线不变 | — | #10 既有 E2E |
| 同行申请入口按资格显示 | 基线不变 | — | #11 既有 E2E |
| 已结束行程展示游后分享区占位 | 基线不变 | — | #12 既有 E2E |

**自检结论：Pass** — 12 条场景全部有落点；无越过 Delta 的新增范围（无后端 / 契约 / 迁移 / 新权限）；三个基线场景明确标注不改代码。
