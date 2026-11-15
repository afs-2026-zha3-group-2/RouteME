CREATE TABLE trip_experiences (
    id INTEGER NOT NULL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content VARCHAR(400) NOT NULL,
    intensity VARCHAR(20) NOT NULL,
    advice VARCHAR(120) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id),
    FOREIGN KEY (author_id) REFERENCES app_users (id),
    CONSTRAINT uq_trip_experience_author UNIQUE (trip_id, author_id)
);

-- 作者均为对应行程已结束时的已接受同行者：trip 1 → user 2，trip 2 → user 3。
INSERT INTO trip_experiences (id, trip_id, author_id, content, intensity, advice, created_at, updated_at) VALUES
    (1, 1, 2,
     '整条线基本没有爬升，骑行段风很大但很值。日落前四十分钟到海滨泳场刚好，再晚机位就满了。晚饭后野狸岛那段灯光偏黄，白平衡要手动调。',
     'MODERATE', '带一件防风外套，海边傍晚温差比市区大。三脚架能不带就不带，走到第三个点会后悔。',
     '2026-11-08T22:10:00Z', '2026-11-08T22:10:00Z'),
    (2, 2, 3,
     '第一天八公里比想象中累，最后两公里全是碎石。但营地那晚的天完全值得。第二天日出要五点半起，观景台风大到站不稳。',
     'TIRING', '鞋一定要抓地，普通跑鞋会滑。水和补给在山下买齐，上面没有小卖部。膝盖不好的可以只走第一天。',
     '2026-11-02T20:45:00Z', '2026-11-02T20:45:00Z');