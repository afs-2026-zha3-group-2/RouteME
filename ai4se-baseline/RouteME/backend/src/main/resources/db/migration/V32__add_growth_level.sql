-- 用户成长等级（REQ-031 / add-growth-level）。
-- 成长与信用分完全分离：经验真相在 user_growth_account，growth_exp_ledger 只追加。
-- 脚本必须同时兼容 SQLite（开发/生产）与 H2（测试），只用两边都支持的语法。

CREATE TABLE user_growth_account (
    user_id BIGINT NOT NULL PRIMARY KEY,
    exp_total INTEGER NOT NULL DEFAULT 0 CHECK (exp_total >= 0),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE TABLE growth_exp_ledger (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    reason_code VARCHAR(40) NOT NULL,
    applied_delta INTEGER NOT NULL,
    exp_before INTEGER NOT NULL CHECK (exp_before >= 0),
    exp_after INTEGER NOT NULL CHECK (exp_after >= 0),
    related_type VARCHAR(40),
    related_id VARCHAR(64),
    idempotency_key VARCHAR(120),
    occurred_at VARCHAR(40) NOT NULL,
    CHECK (exp_after = exp_before + applied_delta)
);

-- 同一业务事件只允许一条流水；SQLite 与 H2 的唯一索引都允许多个 NULL。
CREATE UNIQUE INDEX ux_growth_ledger_idempotency ON growth_exp_ledger (idempotency_key);

CREATE INDEX ix_growth_ledger_user_time ON growth_exp_ledger (user_id, occurred_at);

-- 回填：只补缺失账户，初始 0 EXP；不回填历史发布 / 点赞 / 举报。
INSERT INTO user_growth_account (user_id, exp_total, created_at, updated_at)
SELECT u.id, 0, '2026-11-18T00:00:00Z', '2026-11-18T00:00:00Z'
FROM app_users u
WHERE NOT EXISTS (SELECT 1 FROM user_growth_account g WHERE g.user_id = u.id);
