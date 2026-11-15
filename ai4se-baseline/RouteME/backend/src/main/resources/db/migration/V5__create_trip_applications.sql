CREATE TABLE trip_applications (
    id INTEGER NOT NULL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    applicant_id INTEGER NOT NULL,
    message VARCHAR(120),
    status VARCHAR(20) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    decided_at VARCHAR(40),
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id),
    FOREIGN KEY (applicant_id) REFERENCES app_users (id)
);

-- 与 V4 的 joined_count 对齐：joined_count - 1 = 该行程 ACCEPTED 申请数。
INSERT INTO trip_applications (id, trip_id, applicant_id, message, status, created_at, decided_at) VALUES
    (1, 1, 2, '想学一下怎么等光，顺便骑车。', 'ACCEPTED', '2026-10-29T09:00:00Z', '2026-10-29T10:00:00Z'),
    (2, 2, 1, '想试试两日线，装备齐全。', 'ACCEPTED', '2026-10-18T20:00:00Z', '2026-10-19T09:00:00Z'),
    (3, 2, 3, '没露营过，装备可以借吗？我不怕走路。', 'ACCEPTED', '2026-10-18T21:00:00Z', '2026-10-19T09:05:00Z'),
    (4, 3, 1, '上次那条线我走过，想试试你说的西侧机位，我带三脚架。', 'PENDING', '2026-11-13T10:20:00Z', NULL),
    (5, 4, 1, '想拍骑楼的光影，广角和定焦都带了，走多慢都行。', 'ACCEPTED', '2026-11-11T15:10:00Z', '2026-11-11T18:02:00Z'),
    (6, 5, 3, '东西涌我走过一次，想再走。配速慢一点可以吗？', 'PENDING', '2026-11-14T21:40:00Z', NULL),
    (7, 6, 2, '刚爬完山，正好需要一天不动腿的行程。', 'ACCEPTED', '2026-11-12T13:15:00Z', '2026-11-12T14:00:00Z');