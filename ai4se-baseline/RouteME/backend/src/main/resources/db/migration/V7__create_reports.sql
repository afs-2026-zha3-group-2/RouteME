CREATE TABLE reports (
    id INTEGER NOT NULL PRIMARY KEY,
    target_type VARCHAR(10) NOT NULL,
    target_id INTEGER NOT NULL,
    reporter_id INTEGER NOT NULL,
    reason VARCHAR(20) NOT NULL,
    note VARCHAR(200),
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (reporter_id) REFERENCES app_users (id)
);