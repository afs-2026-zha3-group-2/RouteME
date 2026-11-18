-- 客服会话「标记处理完成」留痕：resolved_at / resolved_by。
-- 状态列已可容纳 RESOLVED（8 字符），无需改列。
ALTER TABLE customer_service_sessions ADD COLUMN resolved_at VARCHAR(40);
ALTER TABLE customer_service_sessions ADD COLUMN resolved_by INTEGER;
