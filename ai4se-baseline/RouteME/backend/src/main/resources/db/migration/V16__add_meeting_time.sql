-- 集合时间列：本地墙上时间，格式 yyyy-MM-ddTHH:mm，可空。
-- 不重建表、不建索引、不回填；集合区域继续使用 V4 的 meeting_area。
ALTER TABLE trip_plans ADD COLUMN meeting_time VARCHAR(16);
