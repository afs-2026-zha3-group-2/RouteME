CREATE TABLE chat_messages (
    id INTEGER NOT NULL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content VARCHAR(500) NOT NULL,
    sent_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id),
    FOREIGN KEY (sender_id) REFERENCES app_users (id),
    FOREIGN KEY (receiver_id) REFERENCES app_users (id)
);

-- trip 4 的发布者（3）与已接受同行者（1）的会话。
INSERT INTO chat_messages (id, trip_id, sender_id, receiver_id, content, sent_at) VALUES
    (1, 4, 3, 1, '周六早上九点陈家祠地铁 D 口集合，可以吗？', '2026-11-12T09:12:00Z'),
    (2, 4, 1, 3, '可以。我带广角，恩宁路那段想拍骑楼底下的光。', '2026-11-12T09:20:00Z'),
    (3, 4, 3, 1, '那中午留久一点，宝华面店要排队。我在附近读书，路我熟。', '2026-11-12T09:24:00Z'),
    (4, 4, 1, 3, '好，那我把三脚架收起来，轻装走。', '2026-11-12T09:31:00Z');