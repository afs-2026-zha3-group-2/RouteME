-- 账号凭据与登录会话。
-- 演示账户（1–3）的 username / password_hash 保持 NULL：它们只能从演示身份入口进入。
ALTER TABLE app_users ADD COLUMN username VARCHAR(20);
ALTER TABLE app_users ADD COLUMN password_hash VARCHAR(200);
CREATE UNIQUE INDEX ux_app_users_username ON app_users (username);

CREATE TABLE auth_sessions (
    token VARCHAR(80) NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    expires_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);