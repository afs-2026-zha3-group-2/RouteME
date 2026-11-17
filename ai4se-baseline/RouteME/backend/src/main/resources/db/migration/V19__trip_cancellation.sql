ALTER TABLE trip_plans ADD COLUMN cancelled_at VARCHAR(40);
ALTER TABLE trip_plans ADD COLUMN cancel_reason VARCHAR(40);
ALTER TABLE trip_plans ADD COLUMN cancel_note VARCHAR(100);

CREATE INDEX idx_trip_plans_cancelled_at ON trip_plans (cancelled_at);
