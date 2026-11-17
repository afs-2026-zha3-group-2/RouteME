-- V17：集合区域多值化（refine-trip-map / REQ-016）。
-- 新增 meeting_areas JSON 数组列；旧 meeting_area 列保留一个版本不删，读写只认新列。
-- 回填用 SQLite 与 H2 都支持的 || 与 REPLACE 拼接（不用 JSON_ARRAY）：
-- 非空旧值包成单元素 JSON 数组，双引号转义；种子值不含反斜杠与控制符。
ALTER TABLE trip_plans ADD COLUMN meeting_areas TEXT;

UPDATE trip_plans
   SET meeting_areas = '["' || REPLACE(meeting_area, '"', '\"') || '"]'
 WHERE meeting_area IS NOT NULL
   AND TRIM(meeting_area) <> '';