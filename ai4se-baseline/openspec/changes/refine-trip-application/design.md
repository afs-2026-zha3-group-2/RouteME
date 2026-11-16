# 设计：refine-trip-application

- **Change:** `refine-trip-application`（REQ-010 / S08；`trip-companions` MODIFIED）
- **依据：** [`proposal.md`](proposal.md)、[`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、[`atdd-design.md`](atdd-design.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:web-coding-style`、`@rule:web-testing`、`@rule:sdd-artifacts`
- **视觉基准：** `docs/prototype/ui.js` `actionBox`、`docs/prototype/styles.css`；实现侧令牌取 `RouteME/frontend/src/styles.css` 的 `:root` 与 `[data-theme="dark"]`

## 1. 关键取舍

### D1 申请区改为详情页内联「下一步」，不再用弹窗

- **Context：** `TripDetailPage` 现在用一个主按钮打开 `Modal` 填说明；原型在操作区直接给出说明框、「提交同行申请」与聊天权限说明。用户明确要求严格按原型。
- **Decision：** 删除申请 `Modal` 与 `applyOpen` 状态；非发布者在详情页底部渲染一个内联申请区：说明输入、提交按钮、聊天说明。发布者的「标记为已结束」「查看同行的申请」保持现状。
- **Rejected：** 保留弹窗只换文案（仍然打断上下文）；新增独立「申请页」（超出单页范围）；把申请区塞进卡片（原型入口只在详情页）。
- **Consequence：** 申请链路在首屏完成；撤回仍用既有确认弹窗（原型 `askConfirm` 也是确认框），不属于「用弹窗承载申请表单」。

### D2 入口状态由纯函数派生，申请状态优先于行程状态

- **Context：** 现有 `canApply` 是四个布尔值的内联组合，待处理 / 已匹配 / 不可申请三种展示散落在多个区块；满员后已匹配用户仍需聊天与退出入口。
- **Decision：** 新增纯函数 `applicationEntryState(trip, userId, application)`，返回 `publisher | pending | accepted | apply | unavailable`。判定顺序：发布者 → pending → accepted → completed → full → apply。满员且已有 pending / accepted 时仍返回 pending / accepted，保留撤回与聊天。
- **Rejected：** 继续在组件里散写布尔判断（无法单测、状态顺序易漂移）；照搬原型 `canApply` 的「先判满员再判申请」（会让满员后的已匹配用户失去聊天 / 退出入口）；把状态放进全局 store（本页局部状态足够）。
- **Consequence：** 展示分支有单一来源，Vitest 直接覆盖状态迁移。

### D3 待处理 / 已匹配 / 不可申请按原型展示

- **Context：** 现状是独立「申请待处理」Tag + 申请说明 + 小号取消按钮；原型是等待提示 + 撤回，已匹配是名单提示 + 沟通，不可申请是原因提示。
- **Decision：** 非发布者的申请区统一按原型分支渲染：
  - pending：「申请已提交，等待 {发布者昵称} 回应。处理前你可以随时撤回。」+「撤回申请」；
  - accepted：「你已在同行名单中，可以和发起人确认集合与安排。」+「与 {发布者昵称} 沟通」+「退出同行」；
  - unavailable：`.action-note.warn` 展示「人数已满」/「行程已结束」/「当前不可申请」；
  - apply：说明框 +「提交同行申请」+ 聊天说明。
  待处理态不重复展示申请人自己填写的说明（原型不展示；发布者仍可在申请列表看到）。
- **Rejected：** 保留 Tag 区块再接内联表单（两套状态源）；pending 继续展示自己的说明（与原型不一致，且信息已在申请列表）；把「已匹配」也改成 Tag（原型用名单提示）。
- **Consequence：** 详情页只剩一个申请状态区；`application-status` 样式不再被申请区使用。

### D4 错误码在页面层映射为可读文案，并刷新状态

- **Context：** `api.ts` 把所有非 2xx 统一抛成 `Error(body.code)`；现状把 `DUPLICATE_APPLICATION` 直接放进 `Alert`。后端顺序是「本人 → 重复 → 非 recruiting」，满员时若已有有效申请会先返回重复错误。
- **Decision：** 新增纯函数 `applicationErrorMessage(code, tripStatus)`：`DUPLICATE_APPLICATION` → 「已申请，请等待回应」；`TRIP_NOT_OPEN` → 按刷新后的行程状态返回「人数已满」/「行程已结束」/「当前不可申请」；其它错误码返回 `null`，保留原始错误码作诊断描述。提交失败后先重新拉取行程状态（页面快照可能过期），再同时刷新「我的申请」与行程详情；成功时写入返回的申请并清空输入。刷新失败时 `TRIP_NOT_OPEN` 退化为「当前不可申请」。
- **Rejected：** 改 `api.ts` 的通用错误行为（影响全站）；只在前端隐藏入口（用户要求后端同样拒绝）；把两种 409 合并成一句「当前不可申请」（丢失重复提示的 AC）。
- **Consequence：** 重复申请出现可读提示并自动进入待处理态；满员 / 结束后入口原因随刷新收敛；未知错误仍能定位错误码。

### D5 撤回沿用确认弹窗，成功后立即恢复申请表单

- **Context：** 既有 `cancelApplication` 已把状态改为 `cancelled`；原型撤回前有确认框。
- **Decision：** 撤回按钮打开既有确认弹窗，确认后调用 `POST /api/applications/{id}/cancel`，把 `myApplication` 更新为返回的已取消记录；纯函数随即返回 `apply`，表单恢复。
- **Rejected：** 撤回后整页 `reload()`（会闪骨架屏，且申请状态已由响应给出）；去掉确认（误触会丢失申请）。
- **Consequence：** 撤回后无需刷新即可再次申请；刷新后仍可申请（已取消不是有效申请）。

### D6 视觉只补申请区样式，使用既有令牌

- **Context：** 实现侧没有 `.apply-form` / `.action-note` / `.textarea` / `.hint` 等原型类；`.label` 已被筛选面板占用为大写小标签。
- **Decision：** 在 `styles.css` 增加详情页作用域样式：`.detail-application .action-box`、`.action-note(.warn)`、`.apply-form`、`.apply-form .label`（覆盖筛选面板的大写样式）、`.apply-form .opt`、`.apply-form .textarea`（作用于 antd `textarea.ant-input`）、`.apply-form .hint`。数值与原型一致，颜色只引用 `var(--*)` 令牌，不写十六进制。
- **Rejected：** 全站引入原型 `.btn` / `.panel` 体系（会与 antd 组件冲突）；直接复用筛选面板的 `.label`（大小写与字号不符）；用内联 style 写魔法像素。
- **Consequence：** 只影响详情页申请区；浅色 / 深色随令牌切换；390px 下输入框与按钮为整行宽度。

### D7 后端、契约、迁移与原型文档不改

- **Context：** 本人 / 重复 / 满员 / 结束拒绝已在 `ApplicationServiceImpl.apply` 实现；`openapi.yaml` 0.7.0 已定义 `message` 选填 ≤120 与两个 409 错误码；原型已定义内联申请区与待处理态。
- **Decision：** 只改前端页面、文案、样式与测试；`openapi.yaml`、`backend/**`、`db/migration/**`、`docs/prototype/**` 零 diff。
- **Rejected：** 为「已申请」新增专用错误码（契约升级，超出范围）；改 `canApply` 的后端顺序以优先返回 `TRIP_NOT_OPEN`（改变既有错误语义）；改原型补重复提示（原型页面不展示该状态）。
- **Consequence：** 后端测试只做回归；契约与迁移零改动。

### D8 测试先行：E2E 覆盖用户路径，纯函数用 Vitest

- **Context：** 现有 `companions.spec.ts` 走弹窗选择器；仓库只有纯逻辑单测（Vitest），没有组件测试库。
- **Decision：** 先改 E2E 并跑红；新增 `applicationEntry.test.ts` 覆盖状态派生与错误映射；E2E 用 `getByRole` / `getByPlaceholder` / `getByText`，直接 API 调用改为相对 `/api`（经 Playwright `baseURL` + Vite proxy，支持隔离端口验证），停留页用例用 `page.request` 制造服务端变化；测试行程用唯一标题并在可完成时由发布者结束，避免污染首页。
- **Rejected：** 只靠 E2E 覆盖状态组合（慢且定位差）；引入组件测试库（仓库未使用，违反「不引入第二套」）；用 `waitForTimeout` 等待刷新。
- **Consequence：** 状态顺序与错误映射有快速回归；用户路径由 6 条 E2E 守住。

### D9 G1 条件与 lint 建议的落点

| 来源 | 条件 | 落点 |
|---|---|---|
| G1 | 内联申请区、说明选填 ≤120、聊天说明；入口仅对可申请行程展示 | D1 / D2 / D3；T3 |
| G1 | 待处理态等待提示 + 撤回；刷新保持；不用字面「已申请，待处理」按钮 | D3；T3；E2E `applies inline…` |
| G1 | 重复 / 满员 / 结束可读映射；两种 409 都处理 | D4；T2；E2E duplicate / fills / ends |
| G1 + L-03 | 满员无申请 → `TRIP_NOT_OPEN`；满员且已有 pending → `DUPLICATE_APPLICATION` | ATDD §2 两条停留页用例；T1 |
| G1 + L-02 | Living Spec 合并后 8 场景、5 个基线语义完整 | T6（P5 / G3 前执行） |
| G1 + L-04 | P5 summary 记录 D2 覆盖 S08 字面按钮 AC | P5 `summary.md`（不在本 change 代码内） |

## 2. 文件与改动面

```text
frontend/src/trips/applicationEntry.ts       新增：入口状态派生 + 错误码映射（纯函数）
frontend/src/trips/applicationEntry.test.ts  新增：Vitest 单元测试
frontend/src/trips/TripDetailPage.tsx        删除申请 Modal；
                                             新增内联「下一步」申请区（apply / pending /
                                             accepted / unavailable 四分支）；
                                             提交失败刷新申请与行程；撤回后恢复表单
frontend/src/i18n/tripMessages.ts            申请区标题、说明标签、原型 placeholder、
                                             「提交同行申请」、聊天说明、撤回、重复 / 满员 /
                                             已结束 / 当前不可申请文案
frontend/src/styles.css                      .detail-application 作用域内的 action-box、
                                             action-note、apply-form、textarea、hint 样式
e2e/tests/companions.spec.ts                 申请段改为内联表单；新增重复、满员、结束、
                                             撤回四条用例；本人行程补无表单断言
```

**不改：** `RouteME/openapi.yaml`、`RouteME/backend/**`、`RouteME/backend/src/main/resources/db/migration/**`、`docs/prototype/**`、`openspec/specs/**`（Living Spec 由归档阶段合并）。

## 3. 交互与展示契约

| 状态 | 触发 | 结果 |
|---|---|---|
| apply | 非本人 + 招募中 + 未满员 + 无 pending / accepted | 显示说明框（placeholder 为原型示例）、「提交同行申请」、聊天说明；无弹窗 |
| 提交中 | 点击「提交同行申请」 | 按钮进入 loading；重复点击不产生第二条申请 |
| pending | 提交成功 / 刷新后仍有待处理申请 | 等待提示（含发布者昵称）+「撤回申请」；不显示表单 |
| accepted | 已有已接受申请 | 名单提示 +「和 TA 聊聊」+「退出同行」；不显示表单 |
| unavailable | 已满员 / 已结束 / 其他不可申请 | 显示「人数已满」/「行程已结束」/「当前不可申请」；无表单 |
| publisher | 自己发布的行程 | 不显示申请区；「查看同行的申请」「标记为已结束」保持可用 |
| 重复申请 | 停留页提交，服务端返回 `DUPLICATE_APPLICATION` | 提示「已申请，请等待回应」；刷新为 pending |
| 满员 / 结束提交 | 停留页提交，服务端返回 `TRIP_NOT_OPEN` | 提示「人数已满」/「行程已结束」；刷新后无表单 |
| 撤回 | pending 时点击「撤回申请」并确认 | 状态「已取消」；表单恢复；刷新后仍可申请 |

**结构契约（非强约束，供 E2E 定位）：**

```text
section.detail-section.detail-application
  h3.section-title                      「下一步」
  div.action-box
    div.apply-form
      label.field
        span.label                       一句申请说明 <span class="opt">让对方知道你为什么合适</span>
        textarea.textarea.ant-input      maxlength=120, rows=3, 原型 placeholder
      button.ant-btn-primary             「提交同行申请」
      p.hint                             聊天权限说明
    p.action-note.warn                   pending 等待提示 / unavailable 原因
    button                              「撤回申请」
```

## 4. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 页面停留期间前端状态为旧快照 | 提交失败后同时刷新「我的申请」与行程；E2E 用 `page.request` 制造满员 / 结束 / 重复后不刷新直接提交 |
| 满员时后端先返回 `DUPLICATE_APPLICATION` | 错误映射分别处理两种 409；测试矩阵覆盖两种分支（L-03） |
| 撤回后 `cancelled` 被误判为有效申请 | `applicationEntryState` 只把 pending / accepted 视为有效；单测覆盖 cancelled → apply |
| 已匹配用户在满员后失去聊天 / 退出 | 状态顺序把 application 放在 trip status 之前；单测覆盖 full + accepted |
| antd `Input.TextArea` 样式覆盖不足 | 使用 `.apply-form textarea.ant-input` 作用域覆盖边框、圆角、focus ring；只引用令牌 |
| 390px 下说明框 / 按钮溢出 | 表单为单列 grid、按钮 `block`；手工核对 1440 / 1024 / 768 / 390 |
| E2E 测试行程累积挤占首页 | 唯一标题；可完成的行程在用例末尾由发布者结束；按 id 直达详情，不依赖首页分页 |
| 重复提交产生第二条申请 | 提交中禁用按钮；服务端仍以 `DUPLICATE_APPLICATION` 兜底 |

## 5. 验证方式

| 检查 | 命令 / 方式 |
|---|---|
| 类型与构建 | `cd RouteME/frontend; npm run build` |
| 前端单测 | `cd RouteME/frontend; npm test` |
| 后端回归 | `cd RouteME/backend; .\mvnw.cmd -B test` |
| E2E | 启动后端 + 前端后 `cd RouteME/e2e; npx playwright test tests/companions.spec.ts` |
| 手工 | 1440 / 1024 / 768 / 390；浅色 / 深色；键盘 Tab；本人 / 可申请 / 待处理 / 已匹配 / 满员 / 已结束六种状态 |
| 规格 | `openspec validate refine-trip-application --strict` |
| 零 diff | `git diff --stat -- RouteME/openapi.yaml RouteME/backend RouteME/backend/src/main/resources/db/migration docs/prototype` |

## 6. 交付边界

- 本设计只覆盖行程详情页的申请入口、申请状态展示、错误映射、撤回与对应测试；不改后端规则、契约、迁移、原型和其他页面。
- Living Spec 合并、P5 summary 口径记录与 G3 属归档阶段，由 T6 与 P5 记录承接。
- 下一步：`/sdd:task-plan` 产出 `tasks.md` 与对齐自检。
