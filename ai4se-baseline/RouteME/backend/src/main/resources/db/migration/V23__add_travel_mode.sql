-- V21：发布行程的出行方式（自驾 driving / 骑行 bicycling / 公共交通 transit）。
-- 可空：本列上线前的行程没有该信息，读取时保持 NULL（前端按未填写处理）。
-- 取值校验在领域层 TripPlan 内完成，不在数据库加 CHECK，避免与后续枚举扩展冲突。
ALTER TABLE trip_plans ADD COLUMN travel_mode TEXT;