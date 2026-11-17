-- 信用账户与信用记录（REQ-019 / add-credit-account）。
-- 分数唯一真相在 user_credit_account；credit_ledger 为 append-only 审计与回算依据。
-- 本迁移同时把 app_users 全表回填为初始 80 分（含无登录凭据的演示账号），
-- 因此不新增「有用户无账户」的半状态。app_users 表结构不变。
-- 注意：脚本必须同时兼容 SQLite（开发/生产）与 H2（测试），只用两边都支持的语法。

CREATE TABLE user_credit_account (
    user_id BIGINT NOT NULL PRIMARY KEY,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE TABLE credit_ledger (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    reason_code VARCHAR(40) NOT NULL,
    applied_delta INTEGER NOT NULL,
    score_before INTEGER NOT NULL CHECK (score_before BETWEEN 0 AND 100),
    score_after INTEGER NOT NULL CHECK (score_after BETWEEN 0 AND 100),
    related_type VARCHAR(40),
    related_id VARCHAR(64),
    idempotency_key VARCHAR(120),
    occurred_at VARCHAR(40) NOT NULL,
    CHECK (score_after = score_before + applied_delta)
);

-- 同一业务事件只允许一条记录；SQLite 与 H2 的唯一索引都允许多个 NULL。
CREATE UNIQUE INDEX ux_credit_ledger_idempotency ON credit_ledger (idempotency_key);

CREATE INDEX ix_credit_ledger_user_time ON credit_ledger (user_id, occurred_at);

-- 回填：只补缺失账户，重复执行不会覆盖已有分数。
INSERT INTO user_credit_account (user_id, score, created_at, updated_at)
SELECT u.id, 80, '2026-11-17T00:00:00Z', '2026-11-17T00:00:00Z'
FROM app_users u
WHERE NOT EXISTS (SELECT 1 FROM user_credit_account c WHERE c.user_id = u.id);
