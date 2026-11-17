-- REQ-018 report evidence: remember which trip chat a user report came from so the admin
-- detail can show the conversation instead of only the reported user's profile.
ALTER TABLE reports ADD COLUMN context_trip_id INTEGER;