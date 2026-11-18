# S30 — 用户成长等级 LV1–LV5

- **Parent REQ：** REQ-029 `requirement-workspace/requirements/REQ-029-growth-level.md`
- **Change：** `add-growth-level`（`user-growth` ADDED）
- **Priority：** P1 ｜ **Iteration：** 迭代 3 ｜ **Points：** 3
- **Page：** 个人主页 / 行程详情 / 同行者信息（落地 6 处展示面）
- **Source：** GitHub Issue [#44](https://github.com/afs-2026-zha3-group-2/RouteME/issues/44)；意图 `requirement-workspace/intents/REQ-029-growth-level.md`；基线 `origin/main@71f3ad4`
- **Status：** P1 drafted（2026-11-18）

## Story statement

作为 **RouteMe 用户**，我希望通过发布真实旅行体验、获得社区认可来提升个人成长等级（LV1–LV5），以便展示我在 RouteMe 中持续参与和贡献的记录，同时帮助其他用户了解我的社区活跃程度。

## AC summary

| 组 | AC | 覆盖场景 |
|---|---|---|
| 等级规则 | 初始 LV1 / 0；每 100 EXP 升一级；LV5 = 400+ 后继续累计；扣经验可回退 | L-1 ~ L-6、R-6 |
| 发布经验 | 首次创建已完成行程体验 +10（配置化）；编辑 / 重复 / 删除重建不再发 | P-1 ~ P-5 |
| 点赞经验 | 单篇每 10 个有效赞 +5；档位锁定；取消不回滚；自赞无效 | K-1 ~ K-6 |
| 每日上限 | 正向每自然日最多 +20（Asia/Shanghai）；跨档按剩余额度截断；档位仍锁定 | D-1 ~ D-5 |
| 举报扣经验 | 所有成立举报 −50；每份一次；不受上限；最低 0 | R-1 ~ R-6 |
| 展示与可见性 | 6 处展示固定 LVn；本人可见经验与距下一级，他人只可见等级 | V-1 ~ V-6 |
| 并发与幂等 | 同档点赞 / 同举报 / 同行程重试都只结算一次 | C-1 ~ C-3 |
| 数据契约 | 流水可回算、无客户端写入口、账户懒建、用户不存在沿用错误 | S-1 ~ S-4 |

## Acceptance scenario

- **Given** 用户 A 已结束一条行程，且尚未发布该行程的体验
- **When** A 首次发布该行程的体验，并随后被 10 个不同用户点赞
- **Then** A 的成长经验 SHALL 为 `10（发布）+ 5（第 10 档）= 15 EXP`，等级为 `LV1`，流水包含「发布体验」与「体验获赞 10 档」两条记录
- **And** A 再次编辑该体验、删除后重建，或第 11–19 个赞增加时，经验 MUST NOT 变化
- **And** 当日 A 继续获得正向事件，最多累计到 20 EXP；跨档时按剩余额度截断，被截断的档位不次日补发
- **And** 若 A 的一份举报被管理员判为成立，A SHALL 立即扣 50 EXP（不足 50 时扣到 0），等级随总经验回退；该扣分不受每日正向上限影响
- **And** 其他用户在个人主页 / 行程卡 / 详情发布者区 / 申请者行 / 同行者卡片只能看到 A 的 `LVn`，看不到具体经验值。

## Requirement traceability

| Story AC | REQ-029 scenario | Change spec（P2 定稿后回填） |
|---|---|---|
| 等级与初始 | L-1 ~ L-6、R-6 | `openspec/changes/add-growth-level/specs/user-growth/spec.md`（待 P2） |
| 发布经验 | P-1 ~ P-5 | 同上 |
| 点赞经验 | K-1 ~ K-6 | 同上 |
| 每日上限 | D-1 ~ D-5 | 同上 |
| 举报扣经验 | R-1 ~ R-6 | 同上 |
| 展示与可见性 | V-1 ~ V-6 | 同上 |
| 并发与幂等 | C-1 ~ C-3 | 同上 |
| 数据契约 | S-1 ~ S-4 | 同上 |

## Size / split note

- 3 点，故事本身不再拆分。
- 单 capability `user-growth`：账户、流水、等级、三类事件结算与展示属于同一条「经验事件 → 防刷 / 上限 → 流水 → 等级 → 展示」链路；拆开会产生两套经验口径。
- 只消费既有体验发布 / 点赞 / 举报成立事件；不改写 `trip-experiences` / `admin-console` / `user-credit` 的 Requirement 语义。

## Out of scope

- 经验明细页 / 流水列表 / 排行榜 / 等级权益 / 徽章 / 证书。
- 通知 / 推送 / 邮件；管理端调整经验或配置。
- 中文等级头衔命名；存量回填。
- 等级影响信用分、限制账号或解锁功能。
- 「路线完成度」「信誉良好 / 警惕」等 #45 的履约指标。
- 改变点赞资格（受限 / 封禁用户点赞是否有效）——沿用现状。
