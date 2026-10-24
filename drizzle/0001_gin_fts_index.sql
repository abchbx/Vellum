-- GIN 索引：drizzle-kit 0.31 的 index() 不支持 using('gin')，
-- 故该索引由手写迁移维护（schema 只负责生成列定义）。
CREATE INDEX IF NOT EXISTS notes_content_tsv_gin ON notes USING gin (content_tsv);
