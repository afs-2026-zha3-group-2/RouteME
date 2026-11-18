-- R4：同一用户同一行程可多次加入 / 退出。
-- 退出事件关联到本次同行关系（trip_applications.id），幂等键改为按关系维度；
-- 旧数据回填为最近一条申请记录，保持历史可读。

ALTER TABLE credit_exit_event ADD COLUMN application_id BIGINT;

UPDATE credit_exit_event
SET application_id = (
    SELECT a.id
    FROM trip_applications a
    WHERE a.trip_id = credit_exit_event.trip_id
      AND a.applicant_id = credit_exit_event.user_id
    ORDER BY a.id DESC
    LIMIT 1
);

CREATE INDEX ix_credit_exit_event_application
    ON credit_exit_event (application_id);
