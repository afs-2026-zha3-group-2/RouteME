-- 体验点赞（REQ-023 / add-experience-like-credit）。
-- 赞数由记录数派生；取消点赞直接删除行；同一用户对同一体验至多一条记录。
-- 注意：脚本必须同时兼容 SQLite（开发/生产）与 H2（测试），只用两边都支持的语法。

CREATE TABLE experience_likes (
    id INTEGER NOT NULL PRIMARY KEY,
    experience_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_experience_likes_experience FOREIGN KEY (experience_id) REFERENCES trip_experiences (id),
    CONSTRAINT fk_experience_likes_user FOREIGN KEY (user_id) REFERENCES app_users (id),
    CONSTRAINT uq_experience_like_user UNIQUE (experience_id, user_id)
);

CREATE INDEX ix_experience_likes_experience ON experience_likes (experience_id);
