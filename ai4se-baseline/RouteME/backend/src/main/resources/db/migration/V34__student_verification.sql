-- 学信网学籍认证（演示核验）：认证状态、认证姓名与院校落在 app_users。
-- 真实姓名与院校只用于核验留痕，不下发给他人；响应里只暴露布尔状态与认证院校。
ALTER TABLE app_users ADD COLUMN student_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_users ADD COLUMN student_verified_name VARCHAR(40);
ALTER TABLE app_users ADD COLUMN student_verified_school VARCHAR(80);
ALTER TABLE app_users ADD COLUMN student_verified_at VARCHAR(40);

-- 产品只面向在校大学生：第 4 个演示账户从「产品经理」改为在校学生，
-- 保留账号、行程 7 与其全部关联数据，避免拆散演示闭环。
UPDATE app_users
   SET birthday = '2004-04-16',
       job = '学生',
       mbti = 'INFP'
 WHERE id = 4;

-- 演示账户（1–4）视为已通过学信网核验，便于直接体验完整闭环；
-- 新注册账号默认未认证，发布 / 申请 / 聊天 / 分享体验前必须完成认证。
UPDATE app_users
   SET student_verified = 1,
       student_verified_name = nickname,
       student_verified_school = CASE id
           WHEN 1 THEN '中山大学'
           WHEN 2 THEN '华南师范大学'
           WHEN 3 THEN '广州美术学院'
           WHEN 4 THEN '同济大学'
           ELSE student_verified_school
       END,
       student_verified_at = '2026-11-18T00:00:00Z'
 WHERE id IN (1, 2, 3, 4);
