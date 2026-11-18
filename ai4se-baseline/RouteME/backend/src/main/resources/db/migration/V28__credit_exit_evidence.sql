-- R2 验收修订：退出说明与证明材料。
-- credit_exit_event.exit_note 保存用户填写的退出说明（≤200 字）；
-- credit_exit_attachment 保存证明图片的元数据，文件本体在本地磁盘；
-- exit_event_id 为空表示已上传但尚未随退出提交（孤儿在 24h 后懒清理）。

ALTER TABLE credit_exit_event ADD COLUMN exit_note VARCHAR(200);

CREATE TABLE credit_exit_attachment (
    id INTEGER NOT NULL PRIMARY KEY,
    exit_event_id INTEGER,
    user_id BIGINT NOT NULL,
    trip_id BIGINT NOT NULL,
    file_name VARCHAR(120) NOT NULL,
    original_name VARCHAR(160),
    content_type VARCHAR(40) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at VARCHAR(40) NOT NULL
);

CREATE INDEX ix_credit_exit_attachment_scope
    ON credit_exit_attachment (user_id, trip_id, exit_event_id);

CREATE INDEX ix_credit_exit_attachment_event
    ON credit_exit_attachment (exit_event_id);
