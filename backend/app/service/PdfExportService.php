<?php

namespace app\service;

use app\model\Album;
use app\model\AlbumPage;
use app\model\PdfExportTask;
use think\facade\Log;
use think\facade\Config;
use Mpdf\Mpdf;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Intervention\Image\Facades\Image;

class PdfExportService
{
    const CHUNK_SIZE = 10;
    const MAX_EXECUTION_TIME = 300;
    const PDF_EXPIRE_HOURS = 24;

    private $fontDir;
    private $tempDir;

    public function __construct()
    {
        $this->fontDir = __DIR__ . '/../fonts/';
        $this->tempDir = app()->getRuntimePath() . 'pdf/';
        if (!is_dir($this->tempDir)) {
            mkdir($this->tempDir, 0755, true);
        }
    }

    public function createTask(int $albumId, int $userId, array $options): PdfExportTask
    {
        $album = Album::find($albumId);
        if (!$album) {
            throw new \Exception('画册不存在');
        }

        $totalPages = AlbumPage::where('album_id', $albumId)->count();
        if ($totalPages === 0) {
            throw new \Exception('画册暂无页面，无法导出');
        }

        $task = new PdfExportTask();
        $task->album_id = $albumId;
        $task->user_id = $userId;
        $task->status = PdfExportTask::STATUS_PENDING;
        $task->progress = 0;
        $task->total_pages = $totalPages;
        $task->processed_pages = 0;
        $task->page_size = $options['page_size'] ?? PdfExportTask::PAGE_SIZE_A4_PORTRAIT;
        $task->show_header = $options['show_header'] ?? true;
        $task->show_footer = $options['show_footer'] ?? true;
        $task->expires_at = date('Y-m-d H:i:s', time() + self::PDF_EXPIRE_HOURS * 3600);
        $task->save();

        return $task;
    }

    public function processTask(int $taskId): bool
    {
        $task = PdfExportTask::find($taskId);
        if (!$task) {
            throw new \Exception('任务不存在');
        }

        if ($task->status === PdfExportTask::STATUS_COMPLETED) {
            return true;
        }

        if ($task->status === PdfExportTask::STATUS_PROCESSING && $task->retry_count === 0) {
            $elapsed = time() - strtotime($task->started_at);
            if ($elapsed < self::MAX_EXECUTION_TIME) {
                return false;
            }
            $task->status = PdfExportTask::STATUS_TIMEOUT;
            $task->error_message = '任务执行超时，准备重试';
            $task->save();
        }

        $task->status = PdfExportTask::STATUS_PROCESSING;
        $task->started_at = date('Y-m-d H:i:s');
        $task->progress = 0;
        $task->processed_pages = 0;
        $task->error_message = '';
        $task->save();

        try {
            $result = $this->generatePdf($task);
            return $result;
        } catch (\Exception $e) {
            $task->status = PdfExportTask::STATUS_FAILED;
            $task->error_message = $e->getMessage();
            $task->retry_count++;
            $task->save();
            Log::error("PDF导出任务失败 [ID: {$taskId}]: " . $e->getMessage());
            return false;
        }
    }

    private function generatePdf(PdfExportTask $task): bool
    {
        $album = Album::find($task->album_id);
        if (!$album) {
            throw new \Exception('画册不存在');
        }

        $mpdf = $this->initializeMpdf($task);
        $mpdf->SetTitle($album->title);
        $mpdf->SetAuthor('Flipbook System');
        $mpdf->SetCreator('Flipbook PDF Export');

        if ($task->show_header) {
            $mpdf->SetHTMLHeader($this->generateHeader($album->title));
        }

        if ($task->show_footer) {
            $mpdf->SetHTMLFooter($this->generateFooter());
        }

        $totalPages = $task->total_pages;
        $chunkSize = self::CHUNK_SIZE;

        for ($offset = 0; $offset < $totalPages; $offset += $chunkSize) {
            if ($this->isExecutionTimedOut($task)) {
                throw new \Exception('PDF生成超时，已处理 ' . $task->processed_pages . ' 页');
            }

            $pages = AlbumPage::where('album_id', $task->album_id)
                ->order('page_number', 'asc')
                ->limit($offset, $chunkSize)
                ->select();

            foreach ($pages as $page) {
                $this->addPageToPdf($mpdf, $page, $task);
                $task->processed_pages++;
                $task->progress = min(99, (int)(($task->processed_pages / $totalPages) * 100));
                $task->save();
            }

            $mpdf->progress = $task->progress;
        }

        $fileName = 'pdf_export_' . $task->id . '_' . time() . '.pdf';
        $relativePath = 'pdf/' . $fileName;
        $fullPath = public_path() . 'uploads/' . $relativePath;

        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }

        $mpdf->Output($fullPath, \Mpdf\Output\Destination::FILE);

        $task->status = PdfExportTask::STATUS_COMPLETED;
        $task->progress = 100;
        $task->file_path = $relativePath;
        $task->file_size = filesize($fullPath);
        $task->completed_at = date('Y-m-d H:i:s');
        $task->save();

        Log::info("PDF导出成功 [ID: {$task->id}]: {$fullPath}");

        return true;
    }

    private function initializeMpdf(PdfExportTask $task): Mpdf
    {
        $pageSize = $this->getPageSizeConfig($task->page_size);

        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];
        $fontDirs[] = $this->fontDir;

        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $fontData = array_merge($fontData, $this->getChineseFontConfig());

        $mpdfConfig = [
            'mode' => 'utf-8',
            'format' => $pageSize['format'],
            'orientation' => $pageSize['orientation'],
            'fontDir' => $fontDirs,
            'fontdata' => $fontData,
            'default_font' => 'notosanssc',
            'tempDir' => $this->tempDir,
            'margin_top' => $task->show_header ? 25 : 10,
            'margin_bottom' => $task->show_footer ? 20 : 10,
            'margin_left' => 10,
            'margin_right' => 10,
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
        ];

        return new Mpdf($mpdfConfig);
    }

    private function getPageSizeConfig(string $pageSize): array
    {
        switch ($pageSize) {
            case PdfExportTask::PAGE_SIZE_A4_LANDSCAPE:
                return ['format' => 'A4', 'orientation' => 'L'];
            case PdfExportTask::PAGE_SIZE_ORIGINAL:
                return ['format' => [210, 297], 'orientation' => 'P'];
            case PdfExportTask::PAGE_SIZE_A4_PORTRAIT:
            default:
                return ['format' => 'A4', 'orientation' => 'P'];
        }
    }

    private function getChineseFontConfig(): array
    {
        return [
            'notosanssc' => [
                'R' => 'NotoSansSC-Regular.ttf',
                'B' => 'NotoSansSC-Bold.ttf',
                'I' => 'NotoSansSC-Regular.ttf',
                'BI' => 'NotoSansSC-Bold.ttf',
                'useOTL' => 0xFF,
                'useKashida' => 75,
            ],
        ];
    }

    private function generateHeader(string $title): string
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
        return <<<HTML
<div style="border-bottom:1px solid #e5e7eb;padding-bottom:8px;font-family:notosanssc;font-size:12px;color:#374151;text-align:center;">
    {$safeTitle}
</div>
HTML;
    }

    private function generateFooter(): string
    {
        return <<<HTML
<div style="border-top:1px solid #e5e7eb;padding-top:8px;font-family:notosanssc;font-size:10px;color:#6b7280;text-align:center;">
    第 {PAGENO} 页 / 共 {nbpg} 页
</div>
HTML;
    }

    private function addPageToPdf(Mpdf $mpdf, AlbumPage $page, PdfExportTask $task): void
    {
        $imagePath = $this->getImageFullPath($page->image);

        if (!$imagePath || !file_exists($imagePath)) {
            $this->addPlaceholderPage($mpdf, $page, $task);
            return;
        }

        try {
            $imageInfo = $this->getImageDimensions($imagePath);
            $pageDimensions = $this->getPageDimensions($task);
            $scaledDimensions = $this->calculateScaledDimensions($imageInfo, $pageDimensions);

            $x = ($pageDimensions['width'] - $scaledDimensions['width']) / 2;
            $y = ($pageDimensions['height'] - $scaledDimensions['height']) / 2;

            if ($task->page_size === PdfExportTask::PAGE_SIZE_ORIGINAL) {
                $mpdf->AddPageByArray([
                    'format' => [$imageInfo['width_mm'], $imageInfo['height_mm']],
                    'margin-top' => 5,
                    'margin-bottom' => 5,
                    'margin-left' => 5,
                    'margin-right' => 5,
                ]);
                $x = 5;
                $y = 5;
                $scaledDimensions['width'] = $imageInfo['width_mm'];
                $scaledDimensions['height'] = $imageInfo['height_mm'];
            } else {
                $mpdf->AddPage();
            }

            $html = $this->generatePageHtml($imagePath, $x, $y, $scaledDimensions, $page);
            $mpdf->WriteHTML($html);

        } catch (\Exception $e) {
            Log::warning("页面图片处理失败 [Page: {$page->id}]: " . $e->getMessage());
            $this->addPlaceholderPage($mpdf, $page, $task);
        }
    }

    private function getImageFullPath(?string $image): ?string
    {
        if (empty($image)) {
            return null;
        }

        if (str_starts_with($image, 'http')) {
            return $image;
        }

        $publicPath = public_path() . ltrim($image, '/');
        if (file_exists($publicPath)) {
            return $publicPath;
        }

        $uploadPath = public_path() . 'uploads/' . ltrim($image, '/');
        if (file_exists($uploadPath)) {
            return $uploadPath;
        }

        return null;
    }

    private function getImageDimensions(string $imagePath): array
    {
        if (str_starts_with($imagePath, 'http')) {
            $tempFile = $this->tempDir . uniqid('img_') . '.tmp';
            file_put_contents($tempFile, file_get_contents($imagePath));
            $imagePath = $tempFile;
        }

        $imgInfo = getimagesize($imagePath);
        if (!$imgInfo) {
            throw new \Exception('无法获取图片信息');
        }

        $dpi = 96;
        return [
            'width' => $imgInfo[0],
            'height' => $imgInfo[1],
            'width_mm' => ($imgInfo[0] / $dpi) * 25.4,
            'height_mm' => ($imgInfo[1] / $dpi) * 25.4,
            'mime' => $imgInfo['mime'],
        ];
    }

    private function getPageDimensions(PdfExportTask $task): array
    {
        switch ($task->page_size) {
            case PdfExportTask::PAGE_SIZE_A4_LANDSCAPE:
                return ['width' => 277, 'height' => 190];
            case PdfExportTask::PAGE_SIZE_A4_PORTRAIT:
            default:
                return ['width' => 190, 'height' => 247];
        }
    }

    private function calculateScaledDimensions(array $imageInfo, array $pageDimensions): array
    {
        $imgRatio = $imageInfo['width_mm'] / $imageInfo['height_mm'];
        $pageRatio = $pageDimensions['width'] / $pageDimensions['height'];

        if ($imgRatio > $pageRatio) {
            $width = $pageDimensions['width'];
            $height = $width / $imgRatio;
        } else {
            $height = $pageDimensions['height'];
            $width = $height * $imgRatio;
        }

        return [
            'width' => $width,
            'height' => $height,
        ];
    }

    private function generatePageHtml(string $imagePath, float $x, float $y, array $dimensions, AlbumPage $page): string
    {
        $imageUrl = 'file://' . $imagePath;
        $pageTitle = htmlspecialchars($page->title ?: '', ENT_QUOTES, 'UTF-8');
        $widthMm = number_format($dimensions['width'], 2);
        $heightMm = number_format($dimensions['height'], 2);
        $xMm = number_format($x, 2);
        $yMm = number_format($y, 2);

        $titleHtml = $pageTitle ? <<<HTML
<div style="position:absolute;top:{$yMm}mm;left:{$xMm}mm;width:{$widthMm}mm;text-align:center;font-family:notosanssc;font-size:11px;color:#374151;padding:4px;background:rgba(255,255,255,0.8);">
    {$pageTitle}
</div>
HTML : '';

        return <<<HTML
<div style="position:relative;width:100%;height:100%;">
    <img src="{$imageUrl}" 
         style="position:absolute;left:{$xMm}mm;top:{$yMm}mm;width:{$widthMm}mm;height:{$heightMm}mm;object-fit:contain;"
         alt="第 {$page->page_number} 页">
    {$titleHtml}
</div>
HTML;
    }

    private function addPlaceholderPage(Mpdf $mpdf, AlbumPage $page, PdfExportTask $task): void
    {
        if ($task->page_size !== PdfExportTask::PAGE_SIZE_ORIGINAL) {
            $mpdf->AddPage();
        } else {
            $mpdf->AddPageByArray([
                'format' => [210, 297],
                'margin-top' => 5,
                'margin-bottom' => 5,
                'margin-left' => 5,
                'margin-right' => 5,
            ]);
        }

        $pageNumber = $page->page_number;
        $html = <<<HTML
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background-color:#f9fafb;border:2px dashed #d1d5db;border-radius:8px;">
    <div style="font-size:48px;color:#9ca3af;">&#128444;</div>
    <div style="font-family:notosanssc;font-size:16px;color:#6b7280;margin-top:16px;">图片暂不可用</div>
    <div style="font-family:notosanssc;font-size:14px;color:#9ca3af;margin-top:8px;">第 {$pageNumber} 页</div>
</div>
HTML;
        $mpdf->WriteHTML($html);
    }

    private function isExecutionTimedOut(PdfExportTask $task): bool
    {
        $elapsed = time() - strtotime($task->started_at);
        return $elapsed > self::MAX_EXECUTION_TIME;
    }

    public function retryTask(int $taskId): bool
    {
        $task = PdfExportTask::find($taskId);
        if (!$task) {
            throw new \Exception('任务不存在');
        }

        if (!$task->canRetry()) {
            throw new \Exception('任务无法重试');
        }

        return $this->processTask($taskId);
    }

    public function getTaskProgress(int $taskId): array
    {
        $task = PdfExportTask::find($taskId);
        if (!$task) {
            throw new \Exception('任务不存在');
        }

        return [
            'id' => $task->id,
            'status' => $task->status,
            'progress' => $task->progress,
            'total_pages' => $task->total_pages,
            'processed_pages' => $task->processed_pages,
            'file_url' => $task->file_url,
            'download_url' => $task->download_url,
            'file_size' => $task->file_size,
            'error_message' => $task->error_message,
            'can_retry' => $task->canRetry(),
            'is_expired' => $task->isExpired(),
            'created_at' => $task->created_at,
            'completed_at' => $task->completed_at,
        ];
    }

    public function cleanupExpiredTasks(): int
    {
        $tasks = PdfExportTask::where('status', PdfExportTask::STATUS_COMPLETED)
            ->where('expires_at', '<', date('Y-m-d H:i:s'))
            ->select();

        $count = 0;
        foreach ($tasks as $task) {
            if (!empty($task->file_path)) {
                $fullPath = public_path() . 'uploads/' . ltrim($task->file_path, '/');
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                }
            }
            $task->file_path = '';
            $task->file_size = 0;
            $task->status = PdfExportTask::STATUS_TIMEOUT;
            $task->error_message = '文件已过期并清理';
            $task->save();
            $count++;
        }

        Log::info("PDF清理任务完成，清理了 {$count} 个过期文件");
        return $count;
    }

    public function getUserTasks(int $userId, int $page = 1, int $limit = 10): array
    {
        $query = PdfExportTask::with('album')
            ->where('user_id', $userId)
            ->order('created_at', 'desc');

        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        return [
            'list' => $list,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ];
    }
}
