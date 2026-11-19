-- 路线完成度声明：发布者结束行程时勾选实际完成的途经点，按 (trip_id, user_id) 唯一。
-- 只统计显式结束（completed_at 非空）且带声明的行程；到期自动完成不产生声明，不计入样本。
-- completed_stop_indexes 为 JSON 整数数组（升序、去重）；planned_stop_count 为结束时的途经点数快照。
CREATE TABLE trip_route_completions (
    id INTEGER NOT NULL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    completed_stop_indexes TEXT NOT NULL,
    planned_stop_count INTEGER NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id),
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);

CREATE UNIQUE INDEX uk_trip_route_completions_trip_user ON trip_route_completions (trip_id, user_id);
CREATE INDEX idx_trip_route_completions_user ON trip_route_completions (user_id);