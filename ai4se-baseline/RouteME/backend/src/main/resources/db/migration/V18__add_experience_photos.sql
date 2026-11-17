CREATE TABLE trip_experience_photos (
    id INTEGER NOT NULL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    experience_id INTEGER NULL,
    file_name VARCHAR(160) NOT NULL,
    mime VARCHAR(40) NOT NULL,
    bytes INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id),
    FOREIGN KEY (author_id) REFERENCES app_users (id),
    FOREIGN KEY (experience_id) REFERENCES trip_experiences (id)
);

CREATE INDEX idx_experience_photos_scope ON trip_experience_photos (trip_id, author_id);
CREATE INDEX idx_experience_photos_experience ON trip_experience_photos (experience_id, sort_order);
