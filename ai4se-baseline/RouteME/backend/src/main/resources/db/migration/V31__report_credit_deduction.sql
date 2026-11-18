-- 举报违规扣分：报告侧留痕。分数真相仍在 user_credit_account，前后快照与关联在 credit_ledger。
-- 两列可空以兼容历史举报；不回填、不推断。
ALTER TABLE reports ADD COLUMN violation_type VARCHAR(32);
ALTER TABLE reports ADD COLUMN applied_deduction INTEGER;
