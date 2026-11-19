-- 行程出发地（城市级）：发布表单新增「出发地」，AI 规划预填时带入。
-- 迁移只加列；已有演示行程按常用出发城市回填，用户自建行程保持为空（详情不展示）。
-- 兼容 SQLite 与 H2：ADD COLUMN 不带默认值时两边都允许。

ALTER TABLE trip_plans ADD COLUMN departure_code VARCHAR(10);

ALTER TABLE trip_plans ADD COLUMN departure VARCHAR(20);

UPDATE trip_plans
SET departure_code = '440100', departure = '广州市'
WHERE departure_code IS NULL
  AND title IN (
    '珠海情侣路摄影一日游',
    '清远英西峰林两日露营',
    '珠海情侣路日落机位二刷',
    '深圳大鹏半岛海岸线徒步',
    '佛山祖庙与岭南天地一日'
  );

UPDATE trip_plans
SET departure_code = '440600', departure = '佛山市'
WHERE departure_code IS NULL AND title = '广州老城骑楼扫街半日';

UPDATE trip_plans
SET departure_code = '310100', departure = '上海市'
WHERE departure_code IS NULL AND title = '上海武康路咖啡散步';
