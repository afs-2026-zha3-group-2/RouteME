# 本地验证报告：refine-inspiration-home（S03 灵感首页双视图）

- **日期：** 2026-11-16（UTC+8）
- **Root：** `D:\zha_training\RouteME\ai4se-baseline`
- **Change id：** `refine-inspiration-home`
- **Scope：** local+evidence
- **范围：** P4 收口验证——灵感首页默认「招募中的行程」视图、状态非颜色信号、「旅行体验」视图与来源行程「已结束」标识、双视图空态与骨架加载；无后端 / 契约 / 迁移改动。

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate：** 本报告 Overall=Pass，可进入 `/sdd:pr-submit`；报告本身不含 Gate 决策，E3 人工评审仍为 Pending（不由 agent 代签）。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend; npm test` | `tasks.md` T2 / T5 / T6 | 0 | 9 个文件 / **74 项通过**（572ms） |
| `cd RouteME/frontend; npm run typecheck` | `tasks.md` T6（静态层） | 0 | `tsc --noEmit` 无输出 |
| `cd RouteME/frontend; npm run build` | `tasks.md` T2–T6 | 0 | `tsc --noEmit && vite build`；1521 modules，`dist` 产出正常 |
| `cd RouteME; npx -y @redocly/cli lint openapi.yaml` | 仓库既有契约门禁 | 0 | `Your API description is valid`，7 warnings（与基线一致，未新增） |
| `cd RouteME/backend; $env:MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"; .\mvnw.cmd -B -ntp test` | `tasks.md` T6 | 0 | **154 项通过**，`BUILD SUCCESS`（25.5s） |
| `cd RouteME/e2e; npx playwright test` | `tasks.md` T1 / T6 | 0 | **18 项通过**（40.6s），三个 spec 全绿 |

> 本机 JVM 未信任企业根证书，`mvnw` 直连 Maven Central 会报 `PKIX path building failed`。正确做法是设置 `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` 使用 Windows 根证书库；本次即用该方式复跑，未使用不安全的 `-Dmaven.wagon.http.ssl.*` 开关。

## 1. 前端测试

```text
cd RouteME/frontend
npm test
```

```text
RUN  v5.1.0 D:/zha_training/RouteME/ai4se-baseline/RouteME/frontend

 Test Files  9 passed (9)
      Tests  74 passed (74)
   Duration  572ms
```

本故事新增的验收在 E2E 层（前端组件无可独立断言的纯函数逻辑，`StatusBadge` 只做「文案 + 图标 + 数据属性」渲染），因此前端单测数不因 S03 增加；74 项为当前主干基线（含 `add-user-auth` 归档后的 `authForm.test.ts`）。

## 2. 前端构建与类型检查

```text
cd RouteME/frontend
npm run typecheck
npm run build
```

```text
> tsc --noEmit

> tsc --noEmit && vite build
✓ 1521 modules transformed.
dist/index.html                   0.97 kB │ gzip:   0.66 kB
dist/assets/index-Dnr9xLbt.css   37.89 kB │ gzip:   8.57 kB
dist/assets/index-DQhfgGcw.js   868.96 kB │ gzip: 275.84 kB
```

- 构建成功；唯一告警是既有 bundle >500 kB（Ant Design 体积），与本次改动无关。

## 3. 契约

```text
cd RouteME
npx -y @redocly/cli lint openapi.yaml
```

```text
Woohoo! Your API description is valid. 🎉
You have 7 warnings.
```

- 0 error；7 warnings 与 P4 之前一致（5 条故意非法的 `rejected` 示例 + 2 条 `/users` 系未声明 4XX），本次未新增。
- S03 复用既有 `GET /api/matches`（默认视图）与 `GET /api/experiences`（体验视图），未改 `openapi.yaml`、未改 `backend/**`、未改 `db/migration/**`；`git show --stat` 复核实现提交 `9a2bdf0` 与测试修复提交 `551666e` 均不含上述路径。

## 4. 后端测试

```text
cd RouteME/backend
$env:MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"
.\mvnw.cmd -B -ntp test
```

```text
[INFO] Tests run: 154, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  25.472 s
```

- S03 无后端改动，本轮为契约与既有能力回归（含 `TripMatchTest`、`ExperienceService*`、`AuthControllerTest`）。

## 5. E2E（真实 Spring Boot + SQLite + Vite）

```text
cd RouteME/e2e
npx playwright test
```

```text
Running 18 tests using 1 worker
...
  18 passed (40.6s)
```

本故事新增 6 个用例，全部通过：

| Spec | 用例 | 覆盖 |
|---|---|---|
| `trips.spec.ts` | `defaults to the recruiting trips view with complete cards` | 默认视图 + 卡片全字段（标题 / 目的地 / 起止日期 / 途经点摘要 / 标签 / 发布者 / 人数 / 状态文字） |
| `trips.spec.ts` | `distinguishes full trips from recruiting trips without color alone` | 已满员 vs 招募中：`data-status` + `data-status-icon` + `.meter.full` |
| `trips.spec.ts` | `keeps ended trips out of the default view` | 已结束行程不出现，也不残留 `completed` 徽标 |
| `experiences.spec.ts` | `switches to the experience view and marks ended origin trips` | 视图切换、无行程卡残留、体验数量、来源行程「已结束」文字 + 旗帜图标 |
| `experiences.spec.ts` | `guides an empty search to publish from both views` | 两个视图空态均提供「去发布行程」并跳转 `#/trips/new` |
| `experiences.spec.ts` | `shows skeletons instead of the previous view while lists load` | 可控 `page.route` 放行，两视图 `[aria-busy="true"]` 骨架且无上一视图卡片残留 |

## 6. 浏览器走查（1440 / 768 / 390）

在真实后端 + Vite 上以演示身份进入首页，逐视图截图并测量横向溢出：

| 宽度 | 招募中的行程视图 | 旅行体验视图 | 横向溢出 |
|---|---|---|---|
| 1440 | 16 张行程卡，16 个状态图标；招募中（人形加号）/ 已满员（锁 + `2 / 2 人` + 满格进度）可区分 | 6 张体验卡，全部带来源行程「已结束」旗帜徽标 | 无（`scrollWidth == innerWidth`） |
| 768 | 同上，两列 / 单列自适应 | 同上 | 无 |
| 390 | 同上，单列 | 同上 | 无 |

- 状态不只依赖颜色：阅读顺序为「图标 + 文字」，图标 `aria-hidden`，屏幕阅读器只读文字。
- 体验卡 `.exp-origin` 在窄屏允许换行，「已结束」徽标不掉出卡片。
- 切换视图时先显示骨架，数据返回后才出现该视图卡片，无上一视图残留。

## 7. Legacy E2E 基线修复（测试专用）

P4 前三个 spec 有 5 个与本故事无关的既有失败，已确认在 `100d246`（S03 之前）即存在，属于 UI 演进后的选择器漂移。经用户裁决「修复 5 个既有用例」，只改测试断言，不改产品代码：

| 用例 | 原断言 | 现断言 | 漂移原因 |
|---|---|---|---|
| `trips.spec.ts` 身份门 | `heading 选择一个演示身份` | `tab 登录` 可见 | 身份门改为「演示身份 + 登录/注册」双入口 |
| `trips.spec.ts` 身份门后 | `heading 旅行灵感` | 一级标题含「今天想走哪条路」 | 首页标题改为问候语 + 行动问句 |
| `trips.spec.ts` 兴趣筛选 | `checkbox 摄影` | `button 摄影` + `aria-pressed=true` | 兴趣筛选改为 chip 按钮组 |
| `trips.spec.ts` 结束行程 | `.ant-popconfirm .ant-btn-primary` | `dialog` 内「标记为已结束」 | `Popconfirm` 改为受控 `Modal` |
| `companions.spec.ts` 退出同行 | `.ant-popconfirm .ant-btn-primary` | `dialog` 内「退出同行」 | 同上 |
| `experiences.spec.ts` 体验卡 CTA | `button 参考此行程发布` | `link 参考此行程发布` | 体验卡 CTA 改为站内链接 |
| `experiences.spec.ts` 复用发布 | 途经点 textarea + `checkbox 摄影` | 地点 chip + `button 摄影[aria-pressed]` | 发布页改为地图点选 / 搜索的地点 chip |
| `companions.spec.ts` 默认视图 | `旅行计划` | `招募中的行程` | 本故事 D1 文案变更 |

## Code-review highlights

- `StatusBadge` 作为唯一状态渲染入口，统一「文案 + `statusTone` 颜色 + 形状图标」，并输出 `data-status` / `data-status-icon`；`TripCard` 与 `ExperienceCard`（`status="completed"`）复用同一组件，避免两处各自拼字符串。
- 图标全部 `aria-hidden`，状态语义由可见文字承载；颜色仅作增强，满足「不得仅以颜色表达状态」。
- `HomePage` 从 `publishAction` 单一来源渲染两个视图的主 CTA；骨架容器按视图给出独立 `aria-label`（`正在加载招募中的行程` / `正在加载旅行体验`），加载中只渲染骨架、不渲染旧视图卡片。
- 未在客户端按 `status` 过滤：默认视图仍消费 `GET /api/matches`（服务端只返回未结束行程），符合 D8「记录事实、不改契约」。
- 无新增依赖、无全局状态、无路由改动；视图状态仍为 `HomePage` 局部 `useState`。
- 变更范围内无死代码：`StatusBadge` 早期版本的 `statusText` 快照导出已删除，未留下未使用导出。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | 需求覆盖（两个 delta Requirement 的 15 个 Scenario） | Pass | [fact] | 15 个 Scenario 均有对应 E2E 或既有用例；新增 6 个 E2E 直接对应默认视图、状态区分、已结束排除、体验视图、空态、骨架 |
| V2 | 场景覆盖（异常 / 边界） | Pass | [fact] | 空结果两视图、加载中、已满员、已结束；错误态沿用既有 `Alert` + 重试 |
| V3 | 契约一致 | Pass | [fact] | `openapi.yaml` 0 error；未改契约；E2E 走真实 `8080` 接口 |
| V4 | 实现正确 | Pass | [fact] | 构建 / 类型 / 单测 / 后端 / E2E 全绿 |
| V5 | 可访问性与非颜色信号 | Pass | [fact] | 文字 + 图标 + `data-*`；视图切换为 radiogroup 且选中态可断言 |
| V6 | 设计一致（D1–D8） | Pass | [fact] | `plansView` 文案、`StatusBadge` 形状图标、`.exp-origin` 徽标、双视图骨架、共享 CTA 均按设计落地 |
| V7 | 任务一致（T1–T6） | Pass | [fact] | `tasks.md` 19 条全部勾选，验证命令与本节一致 |
| V8 | 必要性（无静默范围扩张） | Pass | [fact] | 只改前端展示与 E2E；无发布 / 详情 / 申请 / 聊天 / 分享发布扩展 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告「Local commands」6 条命令全绿；远程 CI 待 PR 后由 `/sdd:pipeline-report` 生成 |
| E2 AI | Pass | 本报告 + 代码走查 + 1440/768/390 走查记录 |
| E3 Human | Pending | 未签；不由 agent 代签 |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | 残余风险 4 项，均为已跟踪的非阻塞项 | ✅ |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | E2E 数据污染：用例通过 API 创建行程后不清理，开发库累积（走查时首页已有 16 条含 `E2E …` 的行程），会稀释演示数据 | [fact] | `e2e/tests/*.spec.ts` + `SqlLite/routeme.db` | 另立 change：E2E 使用独立数据库或 `afterEach` 清理 |
| 2 | 「清除全部条件」在筛选栏与空态各有一个同名按钮，可访问名重复，自动化必须用 `.empty` 作用域定位 | [fact] | `HomePage.tsx` | 后续给筛选栏按钮更明确文案（如「清除筛选」），避免同名 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 体验视图与行程视图骨架数量不同（2 / 3），骨架高度与真实卡片略有差异 | [inference] | `HomePage.tsx` | 若后续视觉要求更高，可按视图给骨架更贴近的占位高度 |
| 2 | `StatusBadge` 目前覆盖 `recruiting / full / completed`；若引入「已取消」等新状态，需同步 `TripStatus`、图标与文案 | [inference] | `trips/StatusBadge.tsx`、`types.ts` | 与 L-02 一并处理 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | L-01：本故事同时改 `trip-plans` 与 `trip-experiences` 两个 capability，属 SA 允许的例外，尚待归档前追认或拆分 | P2 遗留，未在 P4 解决 | tracking（归档前确认） |
| 2 | L-02：「已取消」在 Delta 中被提及但 `TripStatus` 无对应值 | 规格未定义该状态，超出本故事范围 | tracking（新状态需另立 change） |
| 3 | 远程 CI 未运行（P4-3 pipeline report 待 PR 后生成） | 尚未进入 PR 阶段 | tracking |
| 4 | 开发库被 E2E 数据污染（见 WARNING 1） | 测试卫生问题，非产品缺陷 | tracking（另立 change） |

## Waiver

N/A — no waiver.

## 结论

前端构建 / 类型检查 / 74 项单测全绿；`openapi.yaml` 0 error（7 warnings 与基线一致）；后端 154 项全绿；E2E 18 项全绿（含本故事新增 6 项）；1440 / 768 / 390 三档走查无横向溢出，状态与「已结束」标识均可脱离颜色识别。P4 范围内无 CRITICAL 问题，2 条 WARNING 均为测试卫生 / 文案类非阻塞项，Overall **Pass**。

**Apply / verify 分离：** 本报告不构成任何 Gate 决策（未写 G2、未签 E3、未自批 Waiver）；G2 在进入 PR 前仍由人工按 `/sdd:g2-decision-record` 处理。