-- 个人资料列：全部可空，旧账号与演示账号保持 NULL，由读时的派生逻辑视为缺失。
-- 不新增表、不建索引、不回填；school / bio / interests 继续使用 V3 的既有列。
ALTER TABLE app_users ADD COLUMN avatar_url VARCHAR(200);
ALTER TABLE app_users ADD COLUMN birthday VARCHAR(10);
ALTER TABLE app_users ADD COLUMN gender VARCHAR(8);
ALTER TABLE app_users ADD COLUMN city VARCHAR(40);
ALTER TABLE app_users ADD COLUMN major VARCHAR(80);
ALTER TABLE app_users ADD COLUMN job VARCHAR(20);
ALTER TABLE app_users ADD COLUMN mbti VARCHAR(4);
ALTER TABLE app_users ADD COLUMN travel_style VARCHAR(12);