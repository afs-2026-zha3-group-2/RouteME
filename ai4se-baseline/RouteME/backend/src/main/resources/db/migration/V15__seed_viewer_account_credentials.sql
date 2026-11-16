-- 周野（id 4）落库登录凭据：用户名 zhouye，密码 123456。
-- 至此 4 个种子账户全部具备可登录凭据，首页不再展示任何「演示身份直接进入」卡片，
-- 只能通过登录表单进入。哈希算法与 PasswordUtils 一致：
-- PBKDF2-HMAC-SHA256 / 120000 次迭代 / 16 字节随机盐 / 32 字节密钥，格式 pbkdf2$iter$salt$hash。

UPDATE app_users
   SET username = 'zhouye',
       password_hash = 'pbkdf2$120000$s6lk0TAvZlj2EJWiO4I-Og$mVB5NuY22n44Se12RZXLpe_CHqSvQIYqo1ODEOJ5W9E'
 WHERE id = 4;
