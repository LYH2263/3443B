-- 数据大屏性能优化索引迁移
-- 添加访问日志的时间索引，提升分时统计和实时在线查询性能

USE flipbook;

-- 添加 created_at 索引，用于时间范围查询
ALTER TABLE access_logs ADD INDEX idx_created_at (created_at);

-- 添加复合索引，优化按画册+时间的统计查询
ALTER TABLE access_logs ADD INDEX idx_album_created (album_id, created_at);

-- 添加 view_count 索引，优化 Top 榜排序
ALTER TABLE albums ADD INDEX idx_view_count (view_count DESC);
