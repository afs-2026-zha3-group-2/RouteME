CREATE TABLE app_users (
    id INTEGER NOT NULL PRIMARY KEY,
    nickname VARCHAR(40) NOT NULL,
    avatar_initial VARCHAR(4) NOT NULL,
    school VARCHAR(80) NOT NULL,
    bio VARCHAR(1000) NOT NULL,
    interests VARCHAR(1000) NOT NULL,
    created_at VARCHAR(40) NOT NULL
);

INSERT INTO app_users (id, nickname, avatar_initial, school, bio, interests, created_at) VALUES
    (1, '林见夏', '夏', '大三 · 视觉传达',
     '拍照比走路多。喜欢日落前一小时的光，能为了一个机位等很久。预算不高，但愿意为好吃的多走两公里。',
     '["摄影","海边","美食"]', '2026-11-01T10:00:00Z'),
    (2, '陈屿', '屿', '研一 · 地理科学',
     '周末基本在山里。走过的东西会记轨迹和补给点，队伍里我负责收尾，不会把人落下。',
     '["徒步","自然","露营"]', '2026-11-01T10:05:00Z'),
    (3, '苏念', '念', '大二 · 新闻学',
     '为了吃可以跨城。逛展和夜市是我的固定行程，走路不快，行程里一定留坐下来的时间。',
     '["美食","展览","夜景"]', '2026-11-01T10:10:00Z');