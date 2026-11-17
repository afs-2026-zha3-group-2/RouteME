-- REQ-018 admin console: account role/status, report processing and customer service sessions.
-- Portable across SQLite (runtime and migration tests) and H2 (Spring tests).

ALTER TABLE app_users ADD COLUMN email VARCHAR(120);
ALTER TABLE app_users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'USER';
ALTER TABLE app_users ADD COLUMN status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE app_users ADD COLUMN status_reason VARCHAR(200);
ALTER TABLE app_users ADD COLUMN status_updated_at VARCHAR(40);
ALTER TABLE app_users ADD COLUMN status_updated_by INTEGER;
ALTER TABLE app_users ADD COLUMN ban_expires_at VARCHAR(40);
ALTER TABLE app_users ADD COLUMN ban_reason_code VARCHAR(24);
ALTER TABLE app_users ADD COLUMN ban_reason_note VARCHAR(200);

CREATE UNIQUE INDEX ux_app_users_email ON app_users (email);

UPDATE app_users SET role = 'USER' WHERE role IS NULL;
UPDATE app_users SET status = 'ACTIVE' WHERE status IS NULL;

ALTER TABLE reports ADD COLUMN status VARCHAR(12) NOT NULL DEFAULT 'PENDING';
ALTER TABLE reports ADD COLUMN processed_by INTEGER;
ALTER TABLE reports ADD COLUMN processing_at VARCHAR(40);
ALTER TABLE reports ADD COLUMN resolved_at VARCHAR(40);
ALTER TABLE reports ADD COLUMN resolution_note VARCHAR(500);
ALTER TABLE reports ADD COLUMN resolution_action VARCHAR(16);

UPDATE reports SET status = 'PENDING' WHERE status IS NULL;

CREATE INDEX ix_reports_status_created ON reports (status, created_at);

CREATE TABLE customer_service_sessions (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(12) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    joined_at VARCHAR(40),
    joined_by INTEGER,
    closed_at VARCHAR(40),
    closed_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);

CREATE INDEX ix_service_sessions_user ON customer_service_sessions (user_id, status);
CREATE INDEX ix_service_sessions_status ON customer_service_sessions (status, created_at);

CREATE TABLE customer_service_messages (
    id INTEGER NOT NULL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    sender_type VARCHAR(8) NOT NULL,
    sender_id INTEGER NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (session_id) REFERENCES customer_service_sessions (id)
);

CREATE INDEX ix_service_messages_session ON customer_service_messages (session_id, id);

-- Seeded administrator for local/demo use only. Password: admin12345 (PBKDF2-HMAC-SHA256,
-- 120000 iterations, 16-byte salt, 32-byte key, Base64URL without padding), same format as
-- PasswordUtils. Real deployments must replace this account and its credentials.
INSERT INTO app_users (
    id, username, password_hash, nickname, avatar_initial, school, bio, interests, created_at,
    email, role, status
)
SELECT seed.id, seed.username, seed.password_hash, seed.nickname, seed.avatar_initial, seed.school,
       seed.bio, seed.interests, seed.created_at, seed.email, seed.role, seed.status
  FROM (
        SELECT 1000 AS id,
               'admin' AS username,
               'pbkdf2$120000$DxnpE2cRrBT9wbLGE_xJuw$ogqOaUzOeasgL_43abNxNyXqqmiGRkObN9N9_9znakE' AS password_hash,
               '平台管理员' AS nickname,
               '管' AS avatar_initial,
               '' AS school,
               '' AS bio,
               '[]' AS interests,
               '2026-11-17T00:00:00Z' AS created_at,
               NULL AS email,
               'ADMIN' AS role,
               'ACTIVE' AS status
       ) seed
 WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE id = seed.id);