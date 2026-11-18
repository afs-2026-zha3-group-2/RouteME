-- 借款计息与逾期罚息（REQ-028 增补）：
-- 利息 = 本金 × 0.05%/日 × 期限天数，四舍五入到分（1,000 元 / 14 天 = 7 元）；
-- 应还 = 本金 + 利息；逾期罚息 = 本金 × 0.1%/日 × 已开始逾期天数，还款时一并结清。
-- SQLite 无法就地删除 V30 的 CHECK (repay_cents = principal_cents)，因此重建 travel_loan：
-- 建新表 → 按新口径回填 → 删旧表 → 改名 → 重建索引。同一脚本必须兼容 SQLite 与 H2。

CREATE TABLE travel_loan_new (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    trip_id INTEGER NOT NULL,
    principal_cents INTEGER NOT NULL,
    service_fee_cents INTEGER NOT NULL,
    disbursed_cents INTEGER NOT NULL,
    interest_cents INTEGER NOT NULL,
    repay_cents INTEGER NOT NULL,
    penalty_cents INTEGER NOT NULL DEFAULT 0,
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
    CHECK (interest_cents = (principal_cents * 5 * term_days + 5000) / 10000),
    CHECK (repay_cents = principal_cents + interest_cents),
    CHECK (penalty_cents >= 0),
    FOREIGN KEY (user_id) REFERENCES app_users (id),
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id)
);

INSERT INTO travel_loan_new (
    id, user_id, trip_id, principal_cents, service_fee_cents, disbursed_cents,
    interest_cents, repay_cents, penalty_cents, term_days, status, active_user_id,
    funded_at, due_at, repaid_at)
SELECT
    id, user_id, trip_id, principal_cents, service_fee_cents, disbursed_cents,
    (principal_cents * 5 * term_days + 5000) / 10000,
    principal_cents + (principal_cents * 5 * term_days + 5000) / 10000,
    0,
    term_days, status, active_user_id,
    funded_at, due_at, repaid_at
FROM travel_loan;

DROP TABLE travel_loan;

ALTER TABLE travel_loan_new RENAME TO travel_loan;

CREATE UNIQUE INDEX ux_travel_loan_active_user ON travel_loan (active_user_id);
CREATE INDEX ix_travel_loan_user_time ON travel_loan (user_id, funded_at);
CREATE INDEX ix_travel_loan_trip ON travel_loan (trip_id);