-- 为画册表添加音频字段
ALTER TABLE `albums` 
ADD COLUMN `bgm_audio` VARCHAR(500) DEFAULT '' COMMENT '背景音乐文件路径' AFTER `qrcode_text_line2`,
ADD COLUMN `bgm_volume` TINYINT UNSIGNED DEFAULT 80 COMMENT '背景音乐音量 0-100' AFTER `bgm_audio`,
ADD COLUMN `bgm_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用背景音乐' AFTER `bgm_volume`;

-- 为画册页面表添加音频字段
ALTER TABLE `album_pages` 
ADD COLUMN `narration_audio` VARCHAR(500) DEFAULT '' COMMENT '语音解说音频文件路径' AFTER `description`,
ADD COLUMN `narration_duration` INT UNSIGNED DEFAULT 0 COMMENT '语音解说时长（秒）' AFTER `narration_audio`;
