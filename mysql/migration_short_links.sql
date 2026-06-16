SET NAMES utf8mb4;

USE flipbook;

CREATE TABLE IF NOT EXISTS `short_links` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `short_code` VARCHAR(16) NOT NULL COMMENT '短码',
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `remark` VARCHAR(200) DEFAULT '' COMMENT '备注（投放渠道）',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 1启用 0禁用',
  `click_count` INT UNSIGNED DEFAULT 0 COMMENT '累计点击数',
  `last_click_at` DATETIME DEFAULT NULL COMMENT '最近点击时间',
  `creator_id` INT UNSIGNED DEFAULT NULL COMMENT '创建者ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_short_code` (`short_code`),
  KEY `idx_album` (`album_id`),
  KEY `idx_status` (`status`),
  KEY `idx_creator` (`creator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短链表';

CREATE TABLE IF NOT EXISTS `short_link_clicks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `short_link_id` BIGINT UNSIGNED NOT NULL COMMENT '短链ID',
  `short_code` VARCHAR(16) NOT NULL COMMENT '短码',
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `ip` VARCHAR(45) DEFAULT '' COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT '' COMMENT 'UserAgent',
  `referer` VARCHAR(500) DEFAULT '' COMMENT '来源URL',
  `channel` VARCHAR(100) DEFAULT '' COMMENT '来源渠道',
  `is_valid` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否有效（去重后）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_short_link` (`short_link_id`),
  KEY `idx_short_code` (`short_code`),
  KEY `idx_album` (`album_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_ip_time` (`ip`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短链点击表';
