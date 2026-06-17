<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use app\service\PdfExportService;

class CleanPdfExports extends Command
{
    protected function configure()
    {
        $this->setName('clean:pdf-exports')
            ->setDescription('清理过期的PDF导出文件');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('[' . date('Y-m-d H:i:s') . '] 开始清理过期PDF导出文件...');

        try {
            $pdfService = app(PdfExportService::class);
            $count = $pdfService->cleanupExpiredTasks();
            $output->writeln("[" . date('Y-m-d H:i:s') . "] 清理完成，共处理 {$count} 个过期PDF文件");
            Log::info("定时清理过期PDF导出文件完成: {$count} 个");
        } catch (\Exception $e) {
            $output->writeln('[' . date('Y-m-d H:i:s') . '] 清理失败: ' . $e->getMessage());
            Log::error('定时清理过期PDF导出文件失败: ' . $e->getMessage());
        }

        return 0;
    }
}
