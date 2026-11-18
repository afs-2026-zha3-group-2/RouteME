-- REQ-029 通知中心：每个业务事件一行持久化记录。
-- 双引擎（SQLite 运行时与迁移测试 / H2 Spring 测试）只用 INTEGER / VARCHAR / CREATE INDEX。
-- 状态只存 read_at（NULL = UNREAD），READ 不再计入未读；
-- 同一业务事件按 (recipient_id, dedupe_key) 唯一，保证不重复生成。
CREATE TABLE notifications (
    id INTEGER NOT NULL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,
    type VARCHAR(16) NOT NULL,
    event VARCHAR(40) NOT NULL,
    title VARCHAR(80) NOT NULL,
    content VARCHAR(512) NOT NULL,
    priority VARCHAR(8) NOT NULL,
    actor_id INTEGER,
    trip_id INTEGER,
    application_id INTEGER,
    message_id INTEGER,
    report_id INTEGER,
    session_id INTEGER,
    dedupe_key VARCHAR(120) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    read_at VARCHAR(40)
);

CREATE UNIQUE INDEX ux_notifications_recipient_dedupe ON notifications (recipient_id, dedupe_key);
CREATE INDEX ix_notifications_recipient_read ON notifications (recipient_id, read_at);