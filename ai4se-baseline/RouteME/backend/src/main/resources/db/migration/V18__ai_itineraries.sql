-- V18：AI 行程快照（add-ai-itinerary / REQ-017）。
-- 快照以 canonical JSON 文本整存整取，归属当前用户；
-- trip_plans 增可空链接列，普通发布不受影响（既有查询不选新列亦兼容）。
CREATE TABLE ai_itineraries (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);

ALTER TABLE trip_plans ADD COLUMN ai_itinerary_id INTEGER REFERENCES ai_itineraries (id);