-- 第 4 个演示账户：用于公开资料弹窗的非学生形态与统计展示。
-- 保持演示账户：username / password_hash 留空，不能从注册登录路径进入。
INSERT INTO app_users (id, nickname, avatar_initial, school, bio, interests, created_at) VALUES
    (4, '周野', '野', '上班族 · 互联网行业 · INFP',
     '做产品，也做路线。周末能出门就不宅着，喜欢把行程排得松一点，留出临时改主意的时间。',
     '["城市漫步","咖啡","展览"]', '2026-03-15T09:20:00Z');

-- 目的地用标准名与 6 位区划码（上海 310000），与 V11 回填后的存量行风格一致。
INSERT INTO trip_plans (id, publisher_id, title, destination, destination_code, start_date, end_date, stops,
                        meeting_area, note, budget_min_cents, budget_max_cents, tags, capacity, joined_count,
                        completed_at, created_at, updated_at) VALUES
    (7, 4, '上海武康路咖啡散步', '上海市', '310000', '2026-11-28', '2026-11-28',
     '["武康大楼集合","武康路梧桐段","安福路咖啡店","五原路小店收尾"]', '武康大楼正门',
     '以散步和喝咖啡为主，走累了就坐下。适合想聊点工作以外话题的人。', 10000, 20000, '["城市漫步","咖啡","展览"]',
     3, 1, NULL, '2026-11-15T18:00:00Z', '2026-11-15T18:00:00Z');
