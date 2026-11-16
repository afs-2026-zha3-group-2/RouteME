# 设计：refine-inspiration-home

- **Change:** `refine-inspiration-home`（REQ-005 / S03）
- **依据：** [`proposal.md`](proposal.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`atdd-design.md`](atdd-design.md)
- **规则：** `@rule:web-coding-style`、`@rule:web-testing`、`@rule:sdd-artifacts`

## 1. 关键取舍

### D1 默认视图只改文案与标签键，不新增路由

- **Context：** 首页已有 `view: 'plans' | 'experiences'` 的客户端状态，`Segmented` 基于原生 radio input；当前 `tripMessages.plansView` 为「旅行计划」，与 S03 的默认视图命名不符。
- **Decision：** 只把 `plansView` 改为「招募中的行程」，保持 `view` 初值 `'plans'`；`Segmented` 增补 `aria-label="浏览视图"`，选中态沿用原生 radio 的可访问语义。
- **Rejected：** 为每个视图新增路由或 `?view=` 深链（故事明确不要求，且会引入路由回归）；自绘 Tabs（与既有设计系统重复）；顺带改 `publish` / `createTitle`（发布页标题不是视图标签）。
- **Consequence：** 发布页仍显示「发布旅行计划」；首页视图标签与发布页标题语义分离。

### D2 两视图各自条件渲染，数据预取但不混排

- **Context：** `useMatches` 与 `useExperiences` 在首页同时挂载并各自加载；当前渲染已按 `view` 条件分支。
- **Decision：** 保留两个 hook 常驻（切回视图时保留页码与筛选），只渲染当前视图的 `<section>`；加载容器加 `aria-busy="true"`；不在客户端再按 `status` 过滤已结束行程。
- **Rejected：** 切换时卸载 / 重新请求（丢失分页与筛选、增加请求）；客户端过滤 `completed`（会掩盖服务端默认列表回归，且与 `trip-plans` 的数据所有权冲突）；全局单一 loading（无法表达「本视图正在加载」）。
- **Consequence：** 首次切到体验视图时可能直接命中已完成的预取；若仍在加载则显示体验骨架。两种结果都满足「不残留上一视图卡片」。

### D3 状态徽标 = 文字 + 形状图标，颜色只作增强

- **Context：** 现有 `.badge` 由文字 + 颜色 + 伪元素圆点组成；「已满员」与「招募中」的差异主要落在颜色和人数进度条，缺少独立于颜色的形状信号。
- **Decision：** 新增 `frontend/src/trips/StatusBadge.tsx`，按状态渲染内联 SVG 图标 + 文字，并输出结构属性：

  ```text
  <span class="badge {tone} has-icon" data-status="{status}">
    <svg class="status-icon" data-status-icon="{status}" aria-hidden="true" />
    {statusLabel(status)}
  </span>
  ```

  图标固定为：`recruiting` 人形加号、`full` 锁、`completed` 旗帜。`.badge.has-icon::before` 隐藏原伪元素圆点，避免「圆点 + 图标」拥挤。`TripCard` 的封面徽标改用该组件；人数进度条保持既有 `.meter.full` 作为辅助信号。
- **Rejected：** 只用不同颜色深浅（恰好是被验收禁止的做法）；只用 tooltip（触屏与键盘不可见）；用 emoji 作图标（字体差异不可控）；给所有状态加同一个图标（无法区分）。
- **Consequence：** E2E 可用 `[data-status-icon="full"]` / `[data-status-icon="recruiting"]` 做非颜色断言；屏幕阅读器读文字，图标 `aria-hidden` 不重复播报。

### D4 体验卡的「已结束」标识放在来源行

- **Context：** 体验卡头部右侧已被强度徽标占用；来源行 `来自 <行程标题>` 是表达来源状态的自然位置。
- **Decision：** 在 `.exp-origin` 内复用 `StatusBadge status="completed"`，附加 `.exp-origin-badge` 控制尺寸；文案复用 `tripMessages.statusCompleted`（已结束）+ 旗帜图标。
- **Rejected：** 覆盖在卡片封面上（体验卡无封面）；替换强度徽标（丢失体感信息）；只加灰色文字（缺第二信号）；只加颜色边框。
- **Consequence：** 来源标题、目的地与「已结束」在同一行可读；不挤占强度徽标。

### D5 双视图空态统一「去发布行程」，招募视图保留清除条件

- **Context：** 行程空态已有发布按钮（文案「发布行程」）与清除条件按钮；体验空态只有说明文字。REQ §5 要求主按钮文案为「去发布行程」。
- **Decision：** 新增 `tripMessages.goPublish: '去发布行程'`；两个视图的主按钮统一使用该文案并指向 `#/trips/new`；招募视图额外保留「清除全部条件」；在 `HomePage` 内提取本地 `emptyActions` 片段避免两处重复。`publish` 仍留给顶栏「发布行程」。
- **Rejected：** 直接改 `publish`（会改顶栏与发布页文案）；体验空态指向游后分享页（用户还没有可分享的已结束行程）；跳转到详情或筛选重置。
- **Consequence：** 两个空态的主操作一致；顶栏文案不变。

### D6 加载与失败按视图表达，不共享全局遮罩

- **Context：** 现有行程 / 体验分支各自有骨架与错误 `Alert` + 重试。
- **Decision：** 保留按视图的骨架与错误重试；骨架容器加 `aria-busy="true"` 与可读 `aria-label`；筛选区在加载时保持可见，不清空。
- **Rejected：** 全页 spinner（丢失视图语义）；加载时隐藏筛选（用户失去上下文）；把错误态做成 toast（无法重试）。
- **Consequence：** 加载与失败都可被 E2E 稳定定位，且不改变既有错误码展示。

### D7 测试选择器以语义为主，先修既有漂移

- **Context：** `experiences.spec.ts` 仍查询 `.experience-card`，组件实际类名为 `.exp-card`，该 spec 目前无法命中体验卡。
- **Decision：** 把 E2E 选择器改为 `.exp-card`；新增断言优先 `getByRole` / `getByText`，CSS 仅用于卡片结构；加载态用可控 `page.route` 放行，不用 `waitForTimeout`。
- **Rejected：** 给组件再加一个 `experience-card` 类（留下两个名字，漂移继续）；删除既有断言（丢失回归覆盖）。
- **Consequence：** 体验视图 E2E 恢复可信基线；后续改动只需维护一个类名。

### D8 不新增契约；默认视图继续消费 `GET /api/matches`

- **Context：** proposal §决策写「复用 `GET /api/trips` 与 `GET /api/experiences`」，但首页默认视图实际通过 `useMatches` 调 `GET /api/matches`，以保留匹配环与匹配理由；`/api/matches` 同样只返回未结束行程。
- **Decision：** 保持 `GET /api/matches` + `GET /api/experiences`；`openapi.yaml`、后端、迁移均不改动。将 proposal 的端点表述视为事实性笔误，在归档 `summary.md` 中记录，不回写已签署的 proposal。
- **Rejected：** 改用 `GET /api/trips`（会移除首页匹配环与理由，属可见回归）；新增聚合端点（提案明确排除）；为视图切换新增 query 参数（无深链要求）。
- **Consequence：** 验收口径不变：不新增端点、不改响应形状；默认列表仍由服务端保证只含未结束行程。

## 2. 文件与改动面

```text
frontend/src/i18n/tripMessages.ts        plansView → 招募中的行程；新增 goPublish
frontend/src/trips/StatusBadge.tsx       新增：状态文字 + 图标 + data-status 契约
frontend/src/trips/TripCard.tsx          封面徽标改用 StatusBadge；人数区保留 meter
frontend/src/experiences/ExperienceCard.tsx  来源行加「已结束」StatusBadge
frontend/src/home/HomePage.tsx           默认视图；双空态 CTA；骨架 aria-busy；emptyActions
frontend/src/styles.css                  .status-icon / .badge.has-icon / .exp-origin-badge
e2e/tests/trips.spec.ts                  默认视图、卡片字段、满员 vs 招募中、已结束不出现
e2e/tests/experiences.spec.ts            .exp-card 选择器修复；已结束标识、双空态、加载态
```

**不改：** `openapi.yaml`、`backend/**`、`db/migration/**`、`openspec/specs/**`（Living Spec 由归档阶段合并）。

## 3. 状态与展示契约

| status | 文案 | 图标 | tone | 结构属性 | 其他信号 |
|---|---|---|---|---|---|
| `recruiting` | 招募中 | 人形加号 | `surf` | `data-status="recruiting"` / `data-status-icon="recruiting"` | 人数进度未满 |
| `full` | 已满员 | 锁 | `amber` | `data-status="full"` / `data-status-icon="full"` | `.meter.full`（满格） |
| `completed` | 已结束 | 旗帜 | `muted` | `data-status="completed"` / `data-status-icon="completed"` | 仅体验卡来源行使用；默认列表不出现 |

- 状态文字始终存在；图标 `aria-hidden`，不替代文字。
- 颜色（`surf` / `amber` / `muted`）只作增强，不作为唯一区分。
- `data-status` 是展示契约的一部分，E2E 与服务端状态枚举（`recruiting` / `full` / `completed`）同名。

## 4. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 封面徽标变宽挤压目的地 | 图标固定 12×12、字号 11px；在 390px 宽度手工核对；必要时让 `.tc-cover` 允许换行 |
| 伪元素圆点与图标重复 | `.badge.has-icon::before { display: none }`，由图标承担前置符号 |
| 体验来源行过长导致按钮换行 | `.exp-origin` 已 `flex: 1`；徽标 `white-space: nowrap`；390px 下允许 `.exp-foot` 换行 |
| 加载态 E2E 抖动 | 用可控 Promise 拦截路由，先断言 `[aria-busy="true"]` 再放行；禁止固定等待 |
| 默认标签改动影响其它文案 | 只改 `plansView` 与新增 `goPublish`；`publish` / `createTitle` 不动 |
| 共享数据库累积导致断言不稳 | 空态用唯一关键词；新建记录先按唯一标题筛选（既有约定） |
| 「已取消」无枚举值（P2 L-02） | 本设计不新增取消态；默认列表口径由 `/api/matches` 的 `findOpen` 保证，归档时收敛文档 |

## 5. 验证方式

| 检查 | 命令 / 方式 |
|---|---|
| 类型与构建 | `cd RouteME/frontend; npm run build` |
| 前端单测 | `cd RouteME/frontend; npm test` |
| 后端回归 | `cd RouteME/backend; .\mvnw.cmd -B test` |
| E2E | 启动后端 + 前端后 `cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/experiences.spec.ts` |
| 手工 | 1440 / 768 / 390 三档：卡片不溢出、状态徽标可读、视图切换无残留 |