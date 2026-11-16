-- 为 4 个演示账户补齐个人资料，使评审能直接看到完整的资料页（职业 / MBTI / 旅行方式等）。
-- 只改演示账号（id 1–4）的可空资料列，不动昵称、首字头像、兴趣与已有 school 文案；
-- 演示账号仍然 username / password_hash 为 NULL，不能走注册登录路径。
-- 周野（id 4）在 V12 里把「上班族 · 互联网行业 · INFP」塞进了 school 列，此处改由 job / mbti 承载，school 置空。

UPDATE app_users
   SET birthday = '2005-06-12',
       gender = '女',
       city = '珠海',
       job = '学生',
       mbti = 'ISFP',
       travel_style = '休闲游'
 WHERE id = 1;

UPDATE app_users
   SET birthday = '2003-10-24',
       gender = '男',
       city = '广州',
       job = '学生',
       mbti = 'ISTJ',
       travel_style = '深度游'
 WHERE id = 2;

UPDATE app_users
   SET birthday = '2006-03-08',
       gender = '女',
       city = '广州',
       job = '学生',
       mbti = 'ENFP',
       travel_style = '随性游'
 WHERE id = 3;

UPDATE app_users
   SET birthday = '1998-12-03',
       gender = '男',
       city = '上海',
       school = '',
       job = '产品经理',
       mbti = 'INFP',
       travel_style = '休闲游'
 WHERE id = 4;