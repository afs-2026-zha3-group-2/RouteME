-- 信用执行：退出事件、限制记录与申请状态原因（REQ-022 / add-credit-exit-restriction）。
-- credit_exit_event 记录每次退出的档位、月度序号与待核实状态；
-- credit_restriction 记录每段自动限制（active_flag=1 为 active，NULL 为已解除）。

CREATE TABLE credit_exit_event (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    trip_id BIGINT NOT NULL,
    exit_reason VARCHAR(20) NOT NULL,
    exit_at VARCHAR(40) NOT NULL,
    departure_basis_at VARCHAR(40) NOT NULL,
    penalty_tier VARCHAR(20) NOT NULL,
    theoretical_delta INTEGER NOT NULL,
    applied_delta INTEGER NOT NULL,
    monthly_ordinal INTEGER NOT NULL,
    review_status VARCHAR(20) NOT NULL,
    reviewed_at VARCHAR(40),
    ledger_id INTEGER,
    idempotency_key VARCHAR(120) NOT NULL,
    created_at VARCHAR(40) NOT NULL
);

CREATE UNIQUE INDEX ux_credit_exit_event_idempotency
    ON credit_exit_event (user_id, trip_id, idempotency_key);

CREATE INDEX ix_credit_exit_event_user_time
    ON credit_exit_event (user_id, exit_at);

CREATE TABLE credit_restriction (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    trigger_reason VARCHAR(40) NOT NULL,
    trigger_score INTEGER NOT NULL,
    triggered_at VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL,
    active_flag INTEGER,
    lifted_at VARCHAR(40),
    lift_reason VARCHAR(40),
    trigger_ledger_id INTEGER
);

-- active_flag: 1 = active, NULL = lifted；NULL 可重复，因此同一用户最多一条 active。
CREATE UNIQUE INDEX ux_credit_restriction_active
    ON credit_restriction (user_id, active_flag);

CREATE INDEX ix_credit_restriction_user_status
    ON credit_restriction (user_id, status);

ALTER TABLE trip_applications ADD COLUMN status_reason VARCHAR(40);
