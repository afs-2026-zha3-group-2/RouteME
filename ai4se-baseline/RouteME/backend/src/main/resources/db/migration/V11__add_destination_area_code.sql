-- V10：目的地改为 6 位行政区划代码。
-- V9 已被 add-user-auth 占用。SQLite 与 H2 都支持 ADD COLUMN ... NOT NULL DEFAULT，
-- 因此不重建 trip_plans（重建会被 trip_experiences 等外键拦住），而是加列后回填。
-- 存量目的地来自离线地图城市库（14 个广东城市 + 香港/澳门）；未知名称会让 CASE 返回 NULL，
-- 从而被 NOT NULL 拒绝，迁移失败而不是静默丢数据。
-- 香港/澳门旧数据是单城市名，分别落到 v5 的首个二级节点（中西區 / 花地瑪堂區）。
ALTER TABLE trip_plans ADD COLUMN destination_code VARCHAR(6) NOT NULL DEFAULT '';

UPDATE trip_plans
   SET destination_code = CASE REPLACE(destination, '市', '')
        WHEN '珠海' THEN '440400'
        WHEN '广州' THEN '440100'
        WHEN '深圳' THEN '440300'
        WHEN '佛山' THEN '440600'
        WHEN '清远' THEN '441800'
        WHEN '中山' THEN '442000'
        WHEN '江门' THEN '440700'
        WHEN '肇庆' THEN '441200'
        WHEN '惠州' THEN '441300'
        WHEN '东莞' THEN '441900'
        WHEN '阳江' THEN '441700'
        WHEN '湛江' THEN '440800'
        WHEN '韶关' THEN '440200'
        WHEN '汕头' THEN '440500'
        WHEN '香港' THEN '810001'
        WHEN '香港特别行政区' THEN '810001'
        WHEN '澳门' THEN '820001'
        WHEN '澳门特别行政区' THEN '820001'
    END;

UPDATE trip_plans
   SET destination = CASE REPLACE(destination, '市', '')
        WHEN '珠海' THEN '珠海市'
        WHEN '广州' THEN '广州市'
        WHEN '深圳' THEN '深圳市'
        WHEN '佛山' THEN '佛山市'
        WHEN '清远' THEN '清远市'
        WHEN '中山' THEN '中山市'
        WHEN '江门' THEN '江门市'
        WHEN '肇庆' THEN '肇庆市'
        WHEN '惠州' THEN '惠州市'
        WHEN '东莞' THEN '东莞市'
        WHEN '阳江' THEN '阳江市'
        WHEN '湛江' THEN '湛江市'
        WHEN '韶关' THEN '韶关市'
        WHEN '汕头' THEN '汕头市'
        WHEN '香港' THEN '中西區'
        WHEN '香港特别行政区' THEN '中西區'
        WHEN '澳门' THEN '花地瑪堂區'
        WHEN '澳门特别行政区' THEN '花地瑪堂區'
        ELSE destination
    END;

CREATE INDEX idx_trip_plans_destination_code ON trip_plans (destination_code);
