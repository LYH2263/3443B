-- 限时分享链接表
CREATE TABLE IF NOT EXISTS `share_links` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `token` VARCHAR(64) NOT NULL COMMENT '不可猜测的分享token',
  `expire_at` DATETIME DEFAULT NULL COMMENT '过期时间，NULL表示永久有效',
  `max_views` INT UNSIGNED DEFAULT 0 COMMENT '最大访问次数，0表示不限',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已访问次数',
  `access_code` VARCHAR(50) DEFAULT '' COMMENT '附加访问码，空表示无需',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 1有效 0已失效',
  `creator_id` INT UNSIGNED DEFAULT NULL COMMENT '创建者ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_token` (`token`),
  KEY `idx_album` (`album_id`),
  KEY `idx_status` (`status`),
  KEY `idx_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='限时分享链接表';
