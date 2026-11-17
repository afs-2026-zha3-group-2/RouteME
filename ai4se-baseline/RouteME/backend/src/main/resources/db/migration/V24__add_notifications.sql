-- REQ-023 实时通知：每个投递事件一行持久化记录。
-- 双引擎（SQLite 运行时与迁移测试 / H2 Spring 测试）只用 INTEGER / VARCHAR / CREATE INDEX。
-- 未读 = read_at IS NULL；类型拆分由 type 派生，不建独立计数表。
CREATE TABLE notifications (
    id INTEGER NOT NULL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,
    type VARCHAR(24) NOT NULL,
    actor_id INTEGER NOT NULL,
    trip_id INTEGER NOT NULL,
    application_id INTEGER,
    message_id INTEGER,
    created_at VARCHAR(40) NOT NULL,
    read_at VARCHAR(40)
);

CREATE INDEX ix_notifications_recipient_read ON notifications (recipient_id, read_at);