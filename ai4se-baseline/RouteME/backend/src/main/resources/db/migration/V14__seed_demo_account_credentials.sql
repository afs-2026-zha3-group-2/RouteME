-- 为图中 3 个演示账户（林见夏 / 陈屿 / 苏念）落库可登录凭据。
-- 用户名取姓名拼音小写，密码统一为 123456：
-- 存储格式 pbkdf2$迭代次数$盐$散列，算法 PBKDF2-HMAC-SHA256 / 120000 次迭代 / 16 字节随机盐 / 32 字节密钥，
-- 与 PasswordUtils.hash 一致，可直接被登录校验 matches 通过。
-- 注意：写入 username 后，这 3 个账户不再满足「username IS NULL」的演示身份判定，
-- 会从首页「一键进入」卡片中移除（周野 id4 仍为演示账户），改为通过登录表单以用户名 + 123456 登录。

UPDATE app_users
   SET username = 'linjianxia',
       password_hash = 'pbkdf2$120000$lPlsYpVBtoMYcE2teLMHAw$TSWlGkV34mChtC5WPX5HKRorMcvysutPGja0coIdOpk'
 WHERE id = 1;

UPDATE app_users
   SET username = 'chenyu',
       password_hash = 'pbkdf2$120000$EBQr9_uYYbV4buzzaf5k3w$TtVoZ88Mw9qHZCnk_eucazru0dYQ8Hmky41cEH4wBak'
 WHERE id = 2;

UPDATE app_users
   SET username = 'sunian',
       password_hash = 'pbkdf2$120000$EDmUFUqLxdKz9eRJxyQg9Q$oZpeXpAAgygpHaV9KrjUHSNHso-T5bkfA1X6Jw2teI8'
 WHERE id = 3;
