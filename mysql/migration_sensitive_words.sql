SET NAMES utf8mb4;
USE flipbook;

CREATE TABLE IF NOT EXISTS `sensitive_words` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `word` VARCHAR(200) NOT NULL COMMENT '敏感词',
  `level` ENUM('forbid','replace','mark') NOT NULL DEFAULT 'forbid' COMMENT '级别：forbid禁止 replace替换为星号 mark标记待审',
  `category` VARCHAR(50) DEFAULT '' COMMENT '分类',
  `remark` VARCHAR(500) DEFAULT '' COMMENT '备注',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 1启用 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_word` (`word`),
  KEY `idx_level` (`level`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词库表';

CREATE TABLE IF NOT EXISTS `sensitive_whitelist` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `word` VARCHAR(200) NOT NULL COMMENT '白名单词（不视为敏感词）',
  `remark` VARCHAR(500) DEFAULT '' COMMENT '备注',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 1启用 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_word` (`word`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词白名单表';

CREATE TABLE IF NOT EXISTS `pending_contents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `content_type` ENUM('album_title','album_description','album_page_title','album_page_description','comment') NOT NULL COMMENT '内容类型',
  `target_id` INT UNSIGNED NOT NULL COMMENT '关联目标ID（画册ID/页面ID/评论ID）',
  `field_name` VARCHAR(100) NOT NULL COMMENT '字段名',
  `original_content` TEXT COMMENT '原始内容',
  `processed_content` TEXT COMMENT '处理后内容（替换后的）',
  `matched_words` JSON COMMENT '命中的敏感词列表',
  `submitter_id` INT UNSIGNED DEFAULT NULL COMMENT '提交者用户ID',
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending待审 approved通过 rejected驳回',
  `reviewer_id` INT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT '审核时间',
  `review_remark` VARCHAR(500) DEFAULT '' COMMENT '审核备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_content_type` (`content_type`),
  KEY `idx_status` (`status`),
  KEY `idx_target` (`content_type`, `target_id`),
  KEY `idx_submitter` (`submitter_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='待审内容表';

INSERT INTO `sensitive_words` (`word`, `level`, `category`, `remark`) VALUES
('违禁词1', 'forbid', '政治类', '示例敏感词'),
('违禁词2', 'replace', '广告类', '示例替换词'),
('敏感测试', 'mark', '其他', '示例标记词');

INSERT INTO `sensitive_whitelist` (`word`, `remark`) VALUES
('合法词示例', '白名单示例');
