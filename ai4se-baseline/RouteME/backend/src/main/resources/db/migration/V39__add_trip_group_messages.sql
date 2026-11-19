-- 行程群聊消息：满员成行自动建群，发布者与已接受同行者共同协商。
-- 群开设状态不落 trip_plans 列：状态为 full 或本表存在该行程消息即视为群已开。
CREATE TABLE trip_group_messages (
    id INTEGER NOT NULL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content VARCHAR(500) NOT NULL,
    sent_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id),
    FOREIGN KEY (sender_id) REFERENCES app_users (id)
);

CREATE INDEX idx_trip_group_messages_trip ON trip_group_messages (trip_id, sent_at);

-- 回填：存量满员且未取消未结束的行程补一条发布者欢迎消息，演示行程立即有群。
INSERT INTO trip_group_messages (id, trip_id, sender_id, content, sent_at)
SELECT (SELECT COALESCE(MAX(id), 0) FROM trip_group_messages)
           + ROW_NUMBER() OVER (ORDER BY id),
       id,
       publisher_id,
       '人齐了，群聊已开通，路线和集合细节在这里商量。',
       '2026-11-12T09:00:00Z'
FROM trip_plans
WHERE joined_count >= capacity
  AND cancelled_at IS NULL
  AND completed_at IS NULL;