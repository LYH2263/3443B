SET NAMES utf8mb4;

USE flipbook;

CREATE TABLE IF NOT EXISTS `tags` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '标签名称（归一化后）',
  `slug` VARCHAR(100) NOT NULL COMMENT '标签slug（小写去空白）',
  `use_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '使用计数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_use_count` (`use_count` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

CREATE TABLE IF NOT EXISTS `album_tag` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `tag_id` INT UNSIGNED NOT NULL COMMENT '标签ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_album_tag` (`album_id`, `tag_id`),
  KEY `idx_tag` (`tag_id`),
  KEY `idx_album` (`album_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画册-标签关联表';

INSERT INTO `tags` (`name`, `slug`, `use_count`) VALUES
('企业', '企业', 1),
('宣传', '宣传', 1),
('产品', '产品', 1),
('科技', '科技', 1),
('年会', '年会', 1),
('盛典', '盛典', 1);

INSERT INTO `album_tag` (`album_id`, `tag_id`) VALUES
(1, 1), (1, 2),
(2, 3), (2, 4),
(3, 5), (3, 6);
