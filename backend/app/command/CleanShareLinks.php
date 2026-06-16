<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use app\model\ShareLink;

class CleanShareLinks extends Command
{
    protected function configure()
    {
        $this->setName('clean:share-links')
            ->setDescription('清理过期和已达访问上限的分享链接');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('[' . date('Y-m-d H:i:s') . '] 开始清理失效分享链接...');

        try {
            $count = ShareLink::cleanExpiredLinks();
            $output->writeln("[" . date('Y-m-d H:i:s') . "] 清理完成，共处理 {$count} 条失效链接");
            Log::info("定时清理失效分享链接完成: {$count} 条");
        } catch (\Exception $e) {
            $output->writeln('[' . date('Y-m-d H:i:s') . '] 清理失败: ' . $e->getMessage());
            Log::error('定时清理失效分享链接失败: ' . $e->getMessage());
        }

        return 0;
    }
}
