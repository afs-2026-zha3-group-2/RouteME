-- 旅行金融（REQ-028 / add-travel-finance）：钱包、账本、第三方保险状态、借款四表。
-- 金额一律整数分（CNY），与既有 budget_*_cents 同口径；余额唯一真相在 user_wallet。
-- wallet_ledger 为 append-only 审计与回算依据：每条流水的 balance_before ± amount = balance_after。
-- 保险只保存第三方投保结果（提供方 / 保障期 / 状态），不存保费、保额、保单号或身份证等信息。
-- 枚举落库用常量名（CREDIT / DEBIT、LOAN_DISBURSEMENT、ACTIVE）；
-- related_type 无对应 Java 枚举，直接存契约 wire 值（travel_loan）。
-- 本迁移同时把 app_users 全表回填为初始 1,000,000 分（10,000 元），
-- 因此不存在「有用户无钱包」的半状态。脚本必须同时兼容 SQLite 与 H2。

CREATE TABLE user_wallet (
    user_id INTEGER NOT NULL PRIMARY KEY,
    balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);

CREATE TABLE wallet_ledger (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    direction VARCHAR(8) NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    balance_before_cents INTEGER NOT NULL CHECK (balance_before_cents >= 0),
    balance_after_cents INTEGER NOT NULL CHECK (balance_after_cents >= 0),
    entry_type VARCHAR(32) NOT NULL,
    related_type VARCHAR(32) NOT NULL,
    related_id VARCHAR(64) NOT NULL,
    occurred_at VARCHAR(40) NOT NULL,
    CHECK (balance_after_cents = balance_before_cents
           + CASE WHEN direction = 'CREDIT' THEN amount_cents ELSE -amount_cents END),
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);

CREATE TABLE insurance_policy (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    trip_id INTEGER NOT NULL,
    provider VARCHAR(120) NOT NULL,
    coverage_start VARCHAR(10) NOT NULL,
    coverage_end VARCHAR(10) NOT NULL,
    status VARCHAR(16) NOT NULL,
    confirmed_at VARCHAR(40) NOT NULL,
    CHECK (status IN ('ACTIVE', 'EXPIRED')),
    FOREIGN KEY (user_id) REFERENCES app_users (id),
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id)
);

CREATE TABLE travel_loan (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    trip_id INTEGER NOT NULL,
    principal_cents INTEGER NOT NULL,
    service_fee_cents INTEGER NOT NULL,
    disbursed_cents INTEGER NOT NULL,
    repay_cents INTEGER NOT NULL,
    term_days INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL,
    active_user_id INTEGER,
    funded_at VARCHAR(40) NOT NULL,
    due_at VARCHAR(40) NOT NULL,
    repaid_at VARCHAR(40),
    CHECK (principal_cents BETWEEN 10000 AND 200000),
    CHECK (principal_cents % 100 = 0),
    CHECK (term_days IN (7, 14, 30)),
    CHECK (service_fee_cents = principal_cents * 5 / 100),
    CHECK (disbursed_cents = principal_cents - service_fee_cents),
    CHECK (repay_cents = principal_cents),
    FOREIGN KEY (user_id) REFERENCES app_users (id),
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id)
);

-- 每个用户在同一行程只有一条第三方保险状态记录；回写幂等。
CREATE UNIQUE INDEX ux_insurance_policy_user_trip
    ON insurance_policy (user_id, trip_id);
-- 每人最多 1 笔进行中借款：ACTIVE 时 active_user_id = user_id，REPAID 时置 NULL；
-- SQLite 与 H2 的唯一索引都不计 NULL 行，因此无需部分索引。
CREATE UNIQUE INDEX ux_travel_loan_active_user ON travel_loan (active_user_id);

CREATE INDEX ix_wallet_ledger_user_time ON wallet_ledger (user_id, occurred_at);
CREATE INDEX ix_insurance_policy_user_time ON insurance_policy (user_id, confirmed_at);
CREATE INDEX ix_travel_loan_user_time ON travel_loan (user_id, funded_at);
CREATE INDEX ix_travel_loan_trip ON travel_loan (trip_id);

-- 回填：只补缺失钱包，重复执行不会覆盖已有余额。
INSERT INTO user_wallet (user_id, balance_cents, created_at, updated_at)
SELECT u.id, 1000000, '2026-11-17T00:00:00Z', '2026-11-17T00:00:00Z'
FROM app_users u
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = u.id);