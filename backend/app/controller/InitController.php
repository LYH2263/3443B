<?php

namespace app\controller;

use app\model\User;
use think\facade\Log;
use think\facade\Db;
use think\Request;

class InitController
{
    public function init(Request $request)
    {
        $this->initAdminPassword();
        $this->migrateShareLinksTable();
        return json_success([], '初始化完成');
    }

    public function migrateShareLinksTable()
    {
        try {
            $tableExists = Db::query("SHOW TABLES LIKE 'share_links'");
            if (empty($tableExists)) {
                Db::execute("
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
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='限时分享链接表'
                ");
                Log::info('数据库迁移: share_links 表创建成功');
            }
        } catch (\Exception $e) {
            Log::error('share_links 表迁移失败: ' . $e->getMessage());
        }
    }

    public function initAdminPassword()
    {
        $accounts = [
            ['username' => 'admin', 'password' => '123456'],
            ['username' => 'testuser', 'password' => '123456'],
            ['username' => 'vipuser', 'password' => '123456'],
        ];

        foreach ($accounts as $account) {
            $user = User::where('username', $account['username'])->find();
            if ($user) {
                $rawPassword = $user->getData('password');
                if (str_contains($rawPassword, 'placeholder') || !password_verify($account['password'], $rawPassword)) {
                    $user->password = $account['password'];
                    $user->save();
                    Log::info("初始化用户密码: {$account['username']}");
                }
            }
        }
    }

    public function health()
    {
        try {
            \think\facade\Db::query("SELECT 1");
            return json_success([
                'status'    => 'ok',
                'timestamp' => date('Y-m-d H:i:s'),
                'database'  => 'connected',
            ]);
        } catch (\Exception $e) {
            Log::error("Health check failed: " . $e->getMessage());
            return json_error('数据库连接异常', 500);
        }
    }
}
