-- 安全学习考试会话（REQ-023 / add-credit-recovery）。
-- 一次考试一行：开始即计次（R5），通过与否都落 submitted。
-- 只存「完成标记 + 抽中题号 + 作答 + 结果」；不建逐题明细表（design D1）。
-- 月度考试次数按 (user_id, month_key) 计数派生，不建计数表（R5）。
-- 本迁移只新增一张空表，对既有账户与账本零影响；app_users 结构不变。
-- 注意：脚本必须同时兼容 SQLite（开发/生产）与 H2（测试），只用两边都支持的语法。

CREATE TABLE credit_learning_session (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    month_key VARCHAR(7) NOT NULL,
    status VARCHAR(16) NOT NULL,
    question_ids VARCHAR(200) NOT NULL,
    answers VARCHAR(200),
    score INTEGER,
    passed INTEGER,
    started_at VARCHAR(40) NOT NULL,
    learning_completed_at VARCHAR(40),
    submitted_at VARCHAR(40),
    CHECK (status IN ('started', 'submitted')),
    CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    CHECK (passed IS NULL OR passed IN (0, 1)),
    CHECK ((status = 'started' AND answers IS NULL AND score IS NULL AND passed IS NULL)
        OR (status = 'submitted' AND answers IS NOT NULL AND score IS NOT NULL AND passed IS NOT NULL))
);

CREATE INDEX ix_credit_learning_user_month ON credit_learning_session (user_id, month_key);
