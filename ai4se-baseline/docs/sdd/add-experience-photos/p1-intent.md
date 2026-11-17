# P1 意图与提案记录 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 1 + MODIFIED 3）｜ **需求：** REQ-018「游后体验图片上传（S16 增强项）」｜ **阶段：** P1（Intent → proposal）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **基线：** `main@c57a70f`（`openapi.yaml` 0.11.0，迁移到 V17）；P1 只写工件，无代码改动
- **分支：** 主工作区 `main`（P1 产物按阶段提交约定处理）

## 1. 阶段目标

把 S16 的图片上传增强项从模糊意图收口为可判定提案：意图捕获、Ready 条目、deep-dive 四表、影响面、`proposal.md` 与 Delta 草稿；通过 `openspec validate --strict`，停在工件评审门禁等待具名签署。

## 2. 输入与产出

| 类型 | 路径 | 结论 |
|---|---|---|
| 意图捕获 | `requirement-workspace/intents/REQ-018-experience-photos.md` | Discovery Decision = Go（light intake，2026-11-17） |
| Ready 条目 | `requirement-workspace/requirements/REQ-018-experience-photos.md` | 9 场景；DoR BLOCKER 0；blocking OQ 0 |
| deep-dive | `requirement-workspace/deep-dive.md`「REQ-018 增补」 | ①–④ 全部有行、无 `{TBD}`；A0 Pass |
| 影响面 | `requirement-workspace/impact-brief.md` §18 | 单 change；无 blocker；归档顺序约束已记录 |
| 提案 | `openspec/changes/add-experience-photos/proposal.md` | Why / What Changes / 范围 / 影响面 / 决策 / 验收信号 / 残余风险 |
| Delta 草稿 | `openspec/changes/add-experience-photos/specs/trip-experiences/spec.md` | ADDED 1 + MODIFIED 3；20 Scenario（基线保留 11 + 新增 9） |
| 工具校验 | `openspec validate add-experience-photos --strict`；`show --deltas-only` | `valid`；`deltaCount: 4` |

## 3. 用户裁决（2026-11-17）

| id | 议题 | 裁决 |
|---|---|---|
| D1 | 存储与上传边界 | 两步上传 + 本地磁盘 `SqlLite/uploads/experience-photos/`，复用头像模式 |
| D2 | 数据契约 | ≤6 张 / 单张 ≤5MB / JPEG-PNG-WebP 魔数；首图主图；编辑可增删排序；旧文件清理 |
| D3 | 展示位置 | 首页体验卡保持内置封面；仅详情页与分享页展示图片 |
| D4 | 范围与权限 | 仅游后体验；作者可管理，浏览者只读；不含行程发布、聊天、头像、S17 |
| D5 | 缩略图 | 不生成；原图 + CSS 等比 + `loading="lazy"` |
| D6 | EXIF | 上传时全部剥离（GPS、设备、拍摄时间） |
| D7 | 孤儿清理 | 每次上传时懒清理 >24 小时未绑定图片 |
| D8 | 内容审核 | 不做自动审核，沿用举报入口与人工处理 |

## 4. 自检

| 检查 | 结论 |
|---|---|
| DoR Base 8 | 全过 |
| DoR ⑨–⑫（deep-dive） | 全过；A0 Pass |
| blocking open questions | 0 未 resolved |
| split heuristics | 单 change；子目标一句话、端到端可观察、可独立运行、capability 名真实、无依赖环 |
| 归档顺序 | 必须排在 `refine-experience-share` 之后；与同改 `trip-experiences` 的 change 串行 |
| 契约 / 迁移号 | 与在途 `add-ai-itinerary`（计划 0.12.0 + V18）统一排号，P3 定 |

## 5. 工件评审门禁（强制，待签署）

| 工件 | 评审报告 | 签署位 | 状态 |
|---|---|---|---|
| `proposal.md` | `docs/reviews/20261117-add-experience-photos-proposal-review.md` | WAYNE | Approved（2026-11-17） |
| Delta Spec | `docs/reviews/20261117-add-experience-photos-spec-review.md` | WAYNE | Approved（2026-11-17） |
| 两份评审报告 | 同上 | WAYNE + Jay（当前开发者） | Approved（2026-11-17） |

签署来源：用户在 2026-11-17 会话中确认「全部批准」。

未签齐前不进入 P2（`/sdd:delta-craft`）。

## 6. 下一步

- 完成上述签署位 → `/sdd:delta-craft`（P2）→ DoV / AC 复核 → G1（IO=WAYNE / SA=Jacky、Karena）。
- 可选并行：`/sdd:quality-checklist`（phase=p1）；原型先行改动留 P3。
- 不执行 P5；归档必须在 `refine-experience-share` 之后。
