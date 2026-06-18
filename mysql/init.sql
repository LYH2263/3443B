SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS flipbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flipbook;

-- 会员等级表
CREATE TABLE IF NOT EXISTS `member_levels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '等级名称',
  `level` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '等级值，数值越大权限越高',
  `description` VARCHAR(255) DEFAULT '' COMMENT '等级描述',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员等级表';

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(bcrypt)',
  `nickname` VARCHAR(100) DEFAULT '' COMMENT '昵称',
  `email` VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT '' COMMENT '手机号',
  `avatar` VARCHAR(500) DEFAULT '' COMMENT '头像',
  `role` ENUM('admin','user') NOT NULL DEFAULT 'user' COMMENT '角色',
  `member_level_id` INT UNSIGNED DEFAULT 1 COMMENT '会员等级ID',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 1启用 0禁用',
  `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`),
  KEY `idx_member_level` (`member_level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 画册分类表
CREATE TABLE IF NOT EXISTS `album_categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画册分类表';

-- 画册表
CREATE TABLE IF NOT EXISTS `albums` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '画册标题',
  `description` TEXT COMMENT '画册描述',
  `cover_image` VARCHAR(500) DEFAULT '' COMMENT '封面图片',
  `background_image` VARCHAR(500) DEFAULT '' COMMENT '背景图片',
  `category_id` INT UNSIGNED DEFAULT NULL COMMENT '分类ID',
  `min_level` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最低访问等级',
  `share_password` VARCHAR(50) DEFAULT '' COMMENT '分享密码',
  `qrcode_image` VARCHAR(500) DEFAULT '' COMMENT '二维码图片路径',
  `qrcode_logo` VARCHAR(500) DEFAULT '' COMMENT '二维码Logo路径',
  `qrcode_text_line1` VARCHAR(100) DEFAULT '' COMMENT '二维码文字行1',
  `qrcode_text_line2` VARCHAR(100) DEFAULT '' COMMENT '二维码文字行2',
  `bgm_audio` VARCHAR(500) DEFAULT '' COMMENT '背景音乐文件路径',
  `bgm_volume` TINYINT UNSIGNED DEFAULT 80 COMMENT '背景音乐音量 0-100',
  `bgm_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用背景音乐',
  `view_count` INT UNSIGNED DEFAULT 0 COMMENT '浏览次数',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 1发布 0草稿',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `creator_id` INT UNSIGNED DEFAULT NULL COMMENT '创建者ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_min_level` (`min_level`),
  KEY `idx_creator` (`creator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画册表';

-- 画册页面表
CREATE TABLE IF NOT EXISTS `album_pages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `page_number` INT UNSIGNED NOT NULL COMMENT '页码',
  `image` VARCHAR(500) NOT NULL COMMENT '页面图片',
  `title` VARCHAR(200) DEFAULT '' COMMENT '页面标题',
  `description` TEXT COMMENT '页面描述',
  `narration_audio` VARCHAR(500) DEFAULT '' COMMENT '语音解说音频文件路径',
  `narration_duration` INT UNSIGNED DEFAULT 0 COMMENT '语音解说时长（秒）',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_album` (`album_id`),
  KEY `idx_page_number` (`album_id`, `page_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画册页面表';

-- 背景图片库
CREATE TABLE IF NOT EXISTS `background_images` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '图片名称',
  `path` VARCHAR(500) NOT NULL COMMENT '图片路径',
  `thumb_path` VARCHAR(500) DEFAULT '' COMMENT '缩略图路径',
  `category` VARCHAR(50) DEFAULT 'default' COMMENT '分类',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='背景图片库';

-- 访问日志表
CREATE TABLE IF NOT EXISTS `access_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT '用户ID',
  `ip` VARCHAR(45) DEFAULT '' COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT '' COMMENT 'UserAgent',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_album` (`album_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访问日志表';

-- A/B实验表
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

-- A/B实验事件表
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

-- 标签表
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

-- 画册-标签关联表
CREATE TABLE IF NOT EXISTS `album_tag` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `tag_id` INT UNSIGNED NOT NULL COMMENT '标签ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_album_tag` (`album_id`, `tag_id`),
  KEY `idx_tag` (`tag_id`),
  KEY `idx_album` (`album_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画册-标签关联表';

-- 初始化会员等级
INSERT INTO `member_levels` (`id`, `name`, `level`, `description`) VALUES
(1, '普通会员', 0, '注册即为普通会员，可浏览公开画册'),
(2, '银牌会员', 1, '银牌会员，可浏览银牌及以下等级画册'),
(3, '金牌会员', 2, '金牌会员，可浏览金牌及以下等级画册'),
(4, 'VIP会员', 3, 'VIP会员，可浏览所有画册');

-- 初始化管理员账户 (密码会在应用启动时通过PHP bcrypt重新生成)
INSERT INTO `users` (`id`, `username`, `password`, `nickname`, `role`, `member_level_id`, `status`) VALUES
(1, 'admin', '$2y$10$placeholder', '系统管理员', 'admin', 4, 1);

-- 初始化测试用户
INSERT INTO `users` (`id`, `username`, `password`, `nickname`, `role`, `member_level_id`, `status`) VALUES
(2, 'testuser', '$2y$10$placeholder', '测试用户', 'user', 1, 1),
(3, 'vipuser', '$2y$10$placeholder', 'VIP用户', 'user', 4, 1);

-- 初始化画册分类
INSERT INTO `album_categories` (`id`, `name`, `sort_order`, `status`) VALUES
(1, '企业宣传', 1, 1),
(2, '产品展示', 2, 1),
(3, '活动相册', 3, 1),
(4, '个人写真', 4, 1);

-- 初始化示例画册
INSERT INTO `albums` (`id`, `title`, `description`, `cover_image`, `background_image`, `category_id`, `min_level`, `status`, `creator_id`, `qrcode_text_line1`, `qrcode_text_line2`) VALUES
(1, '企业形象宣传册', '展示公司文化、团队风采和发展历程的精美画册', '/images/cover1.png', '/images/bg1.png', 1, 0, 1, 1, '扫码查看画册', '企业形象宣传册'),
(2, '2024年度产品目录', '最新产品展示与技术参数详细目录', '/images/cover2.png', '/images/bg2.png', 2, 1, 1, 1, '扫码查看产品', '2024产品目录'),
(3, '年会精彩瞬间', '记录公司年度盛典的精彩时刻', '/images/cover3.png', '/images/bg3.png', 3, 2, 1, 1, '扫码回顾年会', '2024年度盛典');

-- 初始化示例画册页面
INSERT INTO `album_pages` (`album_id`, `page_number`, `image`, `title`, `sort_order`) VALUES
(1, 1, '/images/a1-p1.png', '企业大厦', 0),
(1, 2, '/images/a1-p2.png', '团队风采', 1),
(1, 3, '/images/a1-p3.png', '办公环境', 2),
(1, 4, '/images/a1-p4.png', '发展趋势', 3),
(2, 1, '/images/a2-p1.png', '科技配件', 0),
(2, 2, '/images/a2-p2.png', '智能家居', 1),
(2, 3, '/images/a2-p3.png', '智能手表', 2),
(2, 4, '/images/a2-p4.png', '无线耳机', 3),
(3, 1, '/images/a3-p1.png', '盛典舞台', 0),
(3, 2, '/images/a3-p2.png', '欢庆时刻', 1),
(3, 3, '/images/a3-p3.png', '颁奖典礼', 2),
(3, 4, '/images/a3-p4.png', '晚宴盛况', 3);

-- 初始化背景图片库
INSERT INTO `background_images` (`name`, `path`, `category`, `created_at`) VALUES
('商务蓝色科技', '/images/bg1.png', 'default', NOW()),
('简约白色纹理', '/images/bg2.png', 'default', NOW()),
('暖色渐变波浪', '/images/bg3.png', 'default', NOW());

-- 初始化标签
INSERT INTO `tags` (`name`, `slug`, `use_count`) VALUES
('企业', '企业', 1),
('宣传', '宣传', 1),
('产品', '产品', 1),
('科技', '科技', 1),
('年会', '年会', 1),
('盛典', '盛典', 1);

-- 初始化画册-标签关联
INSERT INTO `album_tag` (`album_id`, `tag_id`) VALUES
(1, 1), (1, 2),
(2, 3), (2, 4),
(3, 5), (3, 6);

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

-- 短链表
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

-- 敏感词与待审内容表
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

-- PDF 导出任务表
CREATE TABLE IF NOT EXISTS `pdf_export_tasks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `album_id` INT UNSIGNED NOT NULL COMMENT '画册ID',
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT '发起用户ID',
  `status` ENUM('pending','processing','completed','failed','timeout') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  `progress` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '进度 0-100',
  `total_pages` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总页数',
  `processed_pages` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已处理页数',
  `page_size` VARCHAR(20) NOT NULL DEFAULT 'a4_portrait' COMMENT '页面尺寸: a4_portrait/a4_landscape/original',
  `show_header` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示页眉',
  `show_footer` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示页脚',
  `file_path` VARCHAR(500) DEFAULT '' COMMENT '生成的文件路径',
  `file_size` BIGINT UNSIGNED DEFAULT 0 COMMENT '文件大小(字节)',
  `error_message` TEXT COMMENT '错误信息',
  `retry_count` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '重试次数',
  `expires_at` DATETIME DEFAULT NULL COMMENT '过期时间',
  `started_at` DATETIME DEFAULT NULL COMMENT '开始处理时间',
  `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_album` (`album_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画册PDF导出任务表';

-- 数据大屏性能优化索引
ALTER TABLE `access_logs` ADD INDEX `idx_created_at` (`created_at`);
ALTER TABLE `access_logs` ADD INDEX `idx_album_created` (`album_id`, `created_at`);
ALTER TABLE `albums` ADD INDEX `idx_view_count` (`view_count` DESC);

-- 初始化敏感词示例数据
INSERT INTO `sensitive_words` (`word`, `level`, `category`, `remark`) VALUES
('违禁词1', 'forbid', '政治类', '示例敏感词'),
('违禁词2', 'replace', '广告类', '示例替换词'),
('敏感测试', 'mark', '其他', '示例标记词');

INSERT INTO `sensitive_whitelist` (`word`, `remark`) VALUES
('合法词示例', '白名单示例');
