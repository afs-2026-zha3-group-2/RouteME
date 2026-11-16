# AC / DoV review — add-user-profiles

- **Change:** `add-user-profiles`（capability `user-profiles`，REQ-009）
- **Reviewed at:** 2026-11-16（+0800）
- **Inputs:** [`proposal.md`](proposal.md)、[`specs/user-profiles/spec.md`](specs/user-profiles/spec.md)、[`REQ-009-publisher-profile.md`](../../../requirement-workspace/requirements/REQ-009-publisher-profile.md)、[`impact-brief.md`](../../../requirement-workspace/impact-brief.md)（REQ-009 增补）、[`deep-dive.md`](../../../requirement-workspace/deep-dive.md)（REQ-009 增补）、原型 `docs/prototype/`（`ui.js` `profileModal()` / `hostPanel`、`store.js` `stats()`、`styles.css`）
- **裁决基线：** 原型 S02 为视觉与信息结构基准；举报按钮、聊天页资料入口按用户指示排除；隐私文案按实际展示字段调整。

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | 5 Requirement / 20 Scenario | 双入口、展示字段、共同兴趣、统计口径、读取异常、隐私边界均有 Given/When/Then |
| AC-2 AC 可观测 | Pass | 弹窗打开/不跳详情、字段文本、共同兴趣有无、四项数字、错误提示、举报按钮缺席 | 不依赖内部实现细节 |
| AC-3 高风险负向/边界已列出 | Pass | 用户不存在、读取失败、无共同兴趣、自我查看无共同兴趣、无 MBTI、统计为 0、非已接受/未发布不计入、账户凭据缺席、既有举报不受影响 | 已取消行程当前不存在（P3 澄清为未来状态规则，不列入当前测试矩阵） |
| AC-4 不是伪装的实现细节 | Pass | 无表名、无 API 路径、无类名；身份/专业、统计口径为业务规则 | 长度/字段语义保留在业务层 |
| AC-5 与 REQ-009 §4 十条场景对应 | Pass | 见 §需求映射 | 10 条全部落点，另补加入时间/隐私说明与账户凭据两个边界 |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | proposal In/Out 与 spec 五条需求一一对应 | 举报、聊天页入口、资料编辑、隐私字段均已排除 |
| DoV-2 歧义已解决 | Pass | 统计口径、字段语义（学生/上班族/MBTI 选填）、自我查看、隐私文案、种子数据 | 见 proposal §原型对齐决议与 REQ-009 §8 resolved 项 |
| DoV-3 IO/SA 残余风险已记录 | Partial | 见 §残余风险 | 无阻塞项，均有 owner；身份模式分叉需 P3 设计确认 |
| DoV-4 未声称完成实现 | Pass | 仅规格与评审 | — |
| DoV-5 可追溯到 proposal / REQ-009 | Pass | proposal 引用 REQ-009、impact 增补、deep-dive 增补；原型 S02 为视觉证据 | 无未匹配条目 |

**评审结论：** 无阻塞 Fail；DoV-3 为 Partial（残余风险已列 owner），可进入 G1 人工裁决。本文件不是 G1 决策。

## 需求映射

| REQ-009 §4 场景 | 落点 Requirement | 说明 |
|---|---|---|
| 1 从行程卡片打开资料 | 从行程卡片与详情页查看发布者公开资料 | 卡片入口不触发详情 |
| 2 从详情页打开资料 | 同上 | 发布者卡片可点击 |
| 3 弹窗展示公开资料 | 资料弹窗展示公开资料与共同兴趣 | 头像、昵称、身份/专业、加入时间、简介、兴趣、隐私说明 |
| 4 共同兴趣提示 | 同上 | 有交集展示；无交集不展示 |
| 5 展示旅行统计 | 公开资料的四项旅行统计口径 | 四项统计与状态一致 |
| 6 自我查看 | 从行程卡片与详情页查看发布者公开资料 | 「这是你」标识 |
| 7 隐私字段不出现 | 公开资料的隐私边界 | 电话/证件/精确住址/学校门牌/实时位置 |
| 8 资料加载失败 | 资料读取失败与用户不存在 | 用户不存在、读取失败两个 Scenario |
| 9 关闭弹窗 | 从行程卡片与详情页查看发布者公开资料 | 回到原页面、不改变状态 |
| 10 字段缺省展示 | 资料弹窗展示公开资料与共同兴趣 | 无 MBTI 不显示空占位 |

## 原型 ↔ proposal 裁决记录

| # | 冲突/模糊点 | 裁决 | 落点 |
|---|---|---|---|
| 1 | 举报这位用户按钮 | 不做，未来迭代再评估 | Out of scope；隐私边界 Requirement 明确无举报入口 |
| 2 | 聊天页「资料」按钮 | 本次不做，入口仅卡片/详情 | proposal Out of scope |
| 3 | 「学校」字段语义 | 扩展为「身份/年级 · 专业或行业 [· MBTI]」，学生与上班族均可 | 资料弹窗展示 Requirement |
| 4 | 隐私说明文案 | 按实际字段调整，不沿用「只展示昵称、简介与旅行兴趣」 | 资料弹窗展示 Requirement |
| 5 | 自我查看 | 允许并显示「这是你」；举报本就不做 | 入口 Requirement |
| 6 | 卡片发布者入口 | 新增发布者区域点击；不触发卡片跳详情 | 入口 Requirement |
| 7 | 四项统计口径 | 按 prototype `S.stats` | 统计口径 Requirement |
| 8 | 账户凭据 | 公开资料不返回/不展示 username、password_hash、会话令牌 | 隐私边界 Requirement |

## 残余风险

| 风险 | Owner | 处理 |
|---|---|---|
| 统计为请求时实时聚合，可能与并发状态变化存在瞬时差异 | Dev | MVP 数据量小可接受；不引入缓存，验收以同一次读取为准 |
| 身份模式已分叉为演示账户（`X-User-Id`）与注册账户（登录会话） | SA/Dev | P3 设计确认 profile 读取同时支持两种身份方式；不新增权限体系 |
| 新增第 4 个演示用户与其行程会改变种子数据计数 | Dev | 同步更新 `DemoDataMigrationSqliteTest`、`AuthMigrationSqliteTest` 与 E2E 身份门断言 |
| `TripCard` 整体是 `<a>`，发布者区域新增交互元素 | Dev | 重构卡片点击结构，避免嵌套 `<a>/<button>`；发布者点击阻止卡片跳转并保留键盘可达性 |
| `school` 字段名保留但语义扩展 | Dev | UI 文案统一为「身份/专业」；契约字段保持 `school`，不做破坏性重命名 |
| `trip-plans` 当前无「已取消」状态 | BA/Dev | P3 已按当前能力澄清：发布行程统计全部已发布行程；未来引入取消时再启用排除规则 |
| 隐私文案与原型原文不一致 | BA/Dev | 以本 change 裁决后的文案为准；原型原文不作为实现依据 |
