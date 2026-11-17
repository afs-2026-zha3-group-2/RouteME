# proposal 评审报告 — add-experience-photos

- **工件：** `openspec/changes/add-experience-photos/proposal.md`
- **change-id：** `add-experience-photos`
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review`（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`）
- **评审输入：** `proposal.md`；`requirements/REQ-018-experience-photos.md`；`intents/REQ-018-experience-photos.md`；`impact-brief.md` §18；`deep-dive.md`「REQ-018 增补」；原型 S16 AC #4 / 削减顺序；头像上传先例（`openapi.yaml:215-257`）

## 评审结论

**Pass**

提案把「S16 图片增强」收口为单 change：Why 用四层现状证据说明缺口，What Changes 覆盖契约 / 后端 / 前端 / 原型 / 测试，范围与 Out of scope 清晰，D1–D8 与验收信号一一对应，残余风险列出契约排号、归档顺序、磁盘与 EXIF。无 BLOCKER；1 条 WARNING（图像处理依赖）与 3 条 SUGGESTION 留 P3 / P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| P-01 | WARNING | `@rule:web-coding-style` | 「What Changes」后端 / 决策 D6 | EXIF 全量剥离需要引入图像处理库，提案未说明依赖来源与许可证 | P3 `design.md` 选定库并记录许可证、体积与失败降级（解析失败按坏格式拒绝） | 现有 `pom.xml` 无图像处理依赖 |
| P-02 | SUGGESTION | `@rule:spec-first` | 「影响面」契约 / 迁移两行 | 版本号与迁移号写「P3 定」 | P3 与 `add-ai-itinerary`（0.12.0 + V18）统一排号；冲突则顺延 0.13.0 + V19 | `openapi.yaml:4`（0.11.0）、迁移到 V17 |
| P-03 | SUGGESTION | `@rule:web-testing` | 「验收信号」1–8 | 部分信号（>24h 清理、EXIF 剥离）未指定测试层 | P3 `atdd-design.md` 指定：清理用可注入时钟的后端单测；EXIF 用带 GPS 样本 + 字节断言；上传全链路用 E2E | `deep-dive.md` ② |
| P-04 | SUGGESTION | `@rule:sdd-artifacts` | 「规模」 | 规模写 L，但故事点待 SM 估 | P3 前由 SM 确认点数；不影响 split 与 P2 | `registry.md` REQ-018 |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| 是否声明能力变更与 capability 名 | 是：`trip-experiences`（ADDED 1 + MODIFIED 3），与 Living Spec 同名 |
| 是否与 Living Spec 冲突 | 否：图片为可选增强；纯文字、内置封面与发布资格不变 |
| 是否声明 Out of scope | 是：行程封面、聊天、头像、审核、对象存储、卡片改图、S17 复制图片 |
| 是否覆盖隐私规则 | 是：EXIF 全量剥离 + 沿用分享边界提示；不采集电话 / 证件 / 精确住址 |
| 是否原型先行 | 是：「What Changes」与「影响面」均列 `docs/prototype/`，P3 实施 |
| 验收信号是否可观察 | 是：上传 / 拒绝 / 排序 / 首图 / 查看全部 / 401/403 / EXIF / 清理 / 卡片不变 |
| 是否有依赖环 | 否：仅依赖已完成的上传先例；与在途 change 只共享编号 |

## 残余风险

- 契约 / 迁移号与 `add-ai-itinerary` 撞车；P3 排号，必要时顺延。
- 与 `refine-experience-share` 同改 `trip-experiences`；归档必须串行。
- 本地磁盘容量与孤儿文件；上限 + 懒清理 + E2E 隔离目录。
- 无自动审核；依赖举报入口与人工处理，记为产品残余风险。

## 批准记录

- **批准人（proposal）：** WAYNE（IO）
- **批准时间：** 2026-11-17
- **批准来源：** 用户在 2026-11-17 会话中确认「全部批准」
- **报告签署：** WAYNE + Jay（当前开发者）— 2026-11-17
- **批准范围：** 批准提案进入 P2 `/sdd:delta-craft`；P-01 ~ P-04 留 P3 / P4 收口。
