# AC / DoV 复核 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3）｜ **REQ：** REQ-018 游后体验图片上传（S16 增强项）
- **阶段：** P2（Delta 收敛 → AC / DoV 复核）
- **时间：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **输入：** `proposal.md`；`specs/trip-experiences/spec.md`（P2 修订）；`requirements/REQ-018-experience-photos.md`；`deep-dive.md`「REQ-018 增补」；`impact-brief.md` §18；Living Spec `openspec/specs/trip-experiences/spec.md`
- **工具证据：** `openspec validate add-experience-photos --strict` → `valid`；`--deltas-only` → `deltaCount: 5`（ADDED 2 + MODIFIED 3）

## 1. Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少 1 条可测 AC | Pass | 5 条 Requirement / 23 Scenario：ADDED 2（7 + 2）、MODIFIED 3（3 + 5 + 6） | 每条 Requirement 都有 Given/When/Then |
| AC-2 AC 可观察 | Pass | 数量、顺序、可见性、错误码、卡片封面、文件元数据均可断言 | 无「体验良好」类描述 |
| AC-3 负向 / 边界覆盖 | Pass | 第 7 张、>5 MB、错误魔数、403、400、401、未提交移除、24h 孤儿、无图体验 | 覆盖 REQ-018 §4 全部边界 |
| AC-4 非伪实现细节 / 无模糊词 | Pass | P2 已把「403 或 400」固定为 403 `FORBIDDEN` / 400 `INVALID_INPUT`；「可读错误」改为状态码 | `S-02` 已收口 |

## 2. Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | proposal「What Changes」/「范围」与 Delta 5 条 Requirement 对应；ADDED 由 1 拆 2 属结构收敛，不扩范围 | 已同步 proposal 计数 |
| DoV-2 歧义已列出或解决 | Pass | D1–D8 全部 resolved；P-01（图像库）与 S-03（时钟注入）为 P3 设计项，已在残余风险记录 | 无 blocking 歧义 |
| DoV-3 IO / SA 关注点已记录 | Pass | EXIF 剥离依赖库的许可证与失败降级；无自动审核依赖举报入口 | 见 §4 |
| DoV-4 未声称业务实现完成 | Pass | 本复核只评 Delta；无代码 / 契约 / 迁移改动 | — |
| DoV-5 Requirement 可追溯到 proposal / Ready | Pass | 9/9 Ready 场景全部映射（见 §3） | 无未匹配项 |

## 3. 追溯矩阵（REQ-018 §4 → Delta）

| REQ-018 场景 | Delta 承接 | 结论 |
|---|---|---|
| #1 上传并发布带图体验 | ADDED「上传与校验」/ 上传并绑定图片 | 1:1 |
| #2 数量、大小与格式校验 | ADDED「上传与校验」/ 数量、大小与格式校验 | 1:1 |
| #3 编辑时增删与排序 | ADDED「上传与校验」/ 编辑时增删与排序 | 1:1 |
| #4 详情页展示图片 | MODIFIED「详情页展示」/ 首图与查看全部 + 无图不显示空占位 | 1:1 |
| #5 分享页预览与移除 | ADDED「上传与校验」/ 分享页预览与移除 | 1:1 |
| #6 权限边界 | ADDED「上传与校验」/ 归属与越权 + 不存在或已被占用 + 未登录上传被拒绝 | 1:N（三种拒绝原因） |
| #7 历史体验兼容 | MODIFIED 内容口径「无图片也能发布」+ 详情页「无图不显示空占位」+ 首页卡片「保持内置封面」 | 3 条共同承接 |
| #8 首页体验卡不变 | MODIFIED「旅行体验视图」/ 体验卡保持内置封面 | 1:1 |
| #9 元数据剥离与孤儿清理 | ADDED「元数据与清理」/ 上传时剥离元数据 + 孤儿图片懒清理 | 1:1 |

## 4. 残余关注点（不阻断 G1）

| id | 严重度 | 项 | Owner | 时机 |
|---|---|---|---|---|
| R-01 | WARNING | EXIF 剥离需引入图像处理库；库选型、许可证、体积与解析失败降级未定 | Dev / SA | P3 `design.md` |
| R-02 | SUGGESTION | 24h 懒清理依赖可注入时钟或可配置阈值 | Dev | P3 `atdd-design.md` |
| R-03 | SUGGESTION | 不做图片内容审核，依赖举报入口 | BA / SA | 产品残余风险 |
| R-04 | SUGGESTION | 契约 / 迁移号与 `add-ai-itinerary`（0.12.0 + V18）可能撞车 | Dev | P3 统一排号 |

## 5. 结论

**Pass** — AC 4/4、DoV 5/5；BLOCKER 0、WARNING 1（P3 收口）、SUGGESTION 3。Delta 可作为 G1 的规格输入；本文件不构成 G1 决策，G1 由 IO / SA 具名签署后另记 `g1-decision.md`。
