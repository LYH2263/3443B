SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `ab_experiments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `cover_a_image` VARCHAR(500) DEFAULT '' COMMENT '封面A图片路径',
  `cover_b_image` VARCHAR(500) DEFAULT '' COMMENT '封面B图片路径',
  `status` ENUM('running','paused','completed') NOT NULL DEFAULT 'running' COMMENT '实验状态',
  `winner` ENUM('a','b') DEFAULT NULL COMMENT '胜出版本',
  `started_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '实验开始时间',
  `ended_at` DATETIME DEFAULT NULL COMMENT '实验结束时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_album` (`album_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='A/B实验表';

CREATE TABLE IF NOT EXISTS `ab_experiment_events` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `experiment_id` INT UNSIGNED NOT NULL COMMENT '实验ID',
  `visitor_fingerprint` VARCHAR(64) NOT NULL COMMENT '访客指纹',
  `event_type` ENUM('exposure','click') NOT NULL COMMENT '事件类型',
  `variant` ENUM('a','b') NOT NULL COMMENT '版本',
  `ip` VARCHAR(45) DEFAULT '' COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT '' COMMENT 'UserAgent',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_dedup` (`experiment_id`, `visitor_fingerprint`, `event_type`),
  KEY `idx_experiment` (`experiment_id`),
  KEY `idx_event_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='A/B实验事件表';
