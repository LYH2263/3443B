-- 评论表
CREATE TABLE IF NOT EXISTS `comments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `parent_id` INT UNSIGNED DEFAULT NULL COMMENT '父评论ID，顶层为NULL',
  `reply_to_user_id` INT UNSIGNED DEFAULT NULL COMMENT '回复的目标用户ID',
  `content` TEXT NOT NULL COMMENT '评论内容',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 1正常 0隐藏 2待审核',
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶 0否 1是',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
  `reply_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '回复数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_album` (`album_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_album_status` (`album_id`, `status`),
  KEY `idx_album_parent` (`album_id`, `parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表';
