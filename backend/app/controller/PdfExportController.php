<?php

namespace app\controller;

use app\model\Album;
use app\model\AlbumPage;
use app\model\PdfExportTask;
use app\model\MemberLevel;
use app\model\User;
use app\service\PdfExportService;
use think\facade\Log;
use think\Request;
use think\facade\Validate;

class PdfExportController
{
    protected $pdfService;

    public function __construct(PdfExportService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    public function export(Request $request)
    {
        $data = $request->post();
        $albumId = $data['album_id'] ?? 0;
        $userId = $request->uid ?? null;

        if (empty($albumId)) {
            return json_error('请指定画册ID');
        }

        $validate = Validate::rule([
            'page_size' => 'in:a4_portrait,a4_landscape,original',
            'show_header' => 'boolean',
            'show_footer' => 'boolean',
        ])->message([
            'page_size.in' => '页面尺寸参数无效',
            'show_header.boolean' => '页眉参数无效',
            'show_footer.boolean' => '页脚参数无效',
        ]);

        if (!$validate->check($data)) {
            return json_error($validate->getError());
        }

        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        if (!$this->checkExportPermission($request, $album)) {
            return json_error('您没有权限导出此画册', 403);
        }

        $pageCount = AlbumPage::where('album_id', $albumId)->count();
        if ($pageCount === 0) {
            return json_error('画册暂无页面，无法导出');
        }

        try {
            $options = [
                'page_size' => $data['page_size'] ?? PdfExportTask::PAGE_SIZE_A4_PORTRAIT,
                'show_header' => $data['show_header'] ?? true,
                'show_footer' => $data['show_footer'] ?? true,
            ];

            $existing = PdfExportTask::where('album_id', $albumId)
                ->where('user_id', $userId)
                ->whereIn('status', [PdfExportTask::STATUS_PENDING, PdfExportTask::STATUS_PROCESSING])
                ->find();

            if ($existing) {
                return json_success([
                    'task' => $this->pdfService->getTaskProgress($existing->id),
                    'message' => '已有正在进行的导出任务',
                ]);
            }

            $task = $this->pdfService->createTask($albumId, $userId, $options);

            register_shutdown_function(function () use ($task) {
                try {
                    $this->pdfService->processTask($task->id);
                } catch (\Exception $e) {
                    Log::error("PDF导出任务执行失败 [ID: {$task->id}]: " . $e->getMessage());
                }
            });

            return json_success([
                'task' => $this->pdfService->getTaskProgress($task->id),
            ], '导出任务已创建');

        } catch (\Exception $e) {
            Log::error('创建PDF导出任务失败: ' . $e->getMessage());
            return json_error('创建导出任务失败: ' . $e->getMessage());
        }
    }

    public function progress(Request $request, $id)
    {
        $task = PdfExportTask::find($id);
        if (!$task) {
            return json_error('任务不存在', 404);
        }

        if (!$this->checkTaskPermission($request, $task)) {
            return json_error('您没有权限查看此任务', 403);
        }

        try {
            $progress = $this->pdfService->getTaskProgress($id);
            return json_success($progress);
        } catch (\Exception $e) {
            return json_error($e->getMessage());
        }
    }

    public function download(Request $request, $id)
    {
        $task = PdfExportTask::find($id);
        if (!$task) {
            return json_error('任务不存在', 404);
        }

        if (!$this->checkTaskPermission($request, $task)) {
            return json_error('您没有权限下载此文件', 403);
        }

        if ($task->status !== PdfExportTask::STATUS_COMPLETED) {
            return json_error('文件尚未生成完成');
        }

        if ($task->isExpired()) {
            return json_error('文件已过期，请重新导出');
        }

        if (empty($task->file_path)) {
            return json_error('文件不存在，请重新导出');
        }

        $fullPath = public_path() . 'uploads/' . ltrim($task->file_path, '/');
        if (!file_exists($fullPath)) {
            return json_error('文件已被清理，请重新导出');
        }

        $album = Album::find($task->album_id);
        $filename = $album ? $album->title . '.pdf' : 'album_' . $task->album_id . '.pdf';
        $filename = preg_replace('/[^\x{4e00}-\x{9fa5}a-zA-Z0-9_\-\.]/u', '_', $filename);

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($fullPath));
        header('Cache-Control: public, must-revalidate, max-age=0');
        header('Pragma: public');

        readfile($fullPath);
        exit;
    }

    public function retry(Request $request, $id)
    {
        $task = PdfExportTask::find($id);
        if (!$task) {
            return json_error('任务不存在', 404);
        }

        if (!$this->checkTaskPermission($request, $task)) {
            return json_error('您没有权限重试此任务', 403);
        }

        if (!$task->canRetry()) {
            return json_error('任务无法重试，请重新发起导出');
        }

        try {
            register_shutdown_function(function () use ($task) {
                try {
                    $this->pdfService->processTask($task->id);
                } catch (\Exception $e) {
                    Log::error("PDF导出重试失败 [ID: {$task->id}]: " . $e->getMessage());
                }
            });

            $progress = $this->pdfService->getTaskProgress($task->id);
            return json_success($progress, '已重新开始导出');
        } catch (\Exception $e) {
            return json_error($e->getMessage());
        }
    }

    public function myTasks(Request $request)
    {
        $userId = $request->uid;
        if (!$userId) {
            return json_error('请先登录', 401);
        }

        $page = $request->get('page', 1);
        $limit = $request->get('limit', 10);

        try {
            $result = $this->pdfService->getUserTasks($userId, $page, $limit);

            $list = $result['list']->each(function ($item) {
                if ($item->album) {
                    $item->album->cover_image_url = $item->album->cover_image ? get_upload_url($item->album->cover_image) : '';
                }
                $item->file_url = $item->file_url;
                $item->download_url = $item->download_url;
                $item->can_retry = $item->canRetry();
                $item->is_expired = $item->isExpired();
                return $item;
            });

            return json_success([
                'list' => $list,
                'total' => $result['total'],
                'page' => (int)$page,
                'limit' => (int)$limit,
            ]);
        } catch (\Exception $e) {
            return json_error($e->getMessage());
        }
    }

    public function adminList(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $status = $request->get('status', '');
        $albumId = $request->get('album_id', '');
        $userId = $request->get('user_id', '');

        $query = PdfExportTask::with(['album', 'user']);

        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($albumId !== '') {
            $query->where('album_id', $albumId);
        }
        if ($userId !== '') {
            $query->where('user_id', $userId);
        }

        $total = $query->count();
        $list = $query->order('created_at', 'desc')
            ->page($page, $limit)
            ->select()
            ->each(function ($item) {
                if ($item->album) {
                    $item->album->cover_image_url = $item->album->cover_image ? get_upload_url($item->album->cover_image) : '';
                }
                $item->file_url = $item->file_url;
                $item->download_url = $item->download_url;
                $item->can_retry = $item->canRetry();
                $item->is_expired = $item->isExpired();
                return $item;
            });

        return json_success([
            'list' => $list,
            'total' => $total,
            'page' => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function adminCleanup(Request $request)
    {
        try {
            $count = $this->pdfService->cleanupExpiredTasks();
            return json_success(['cleaned_count' => $count], "已清理 {$count} 个过期文件");
        } catch (\Exception $e) {
            return json_error('清理失败: ' . $e->getMessage());
        }
    }

    private function checkExportPermission(Request $request, Album $album): bool
    {
        $userId = $request->uid;
        if (!$userId) {
            return false;
        }

        $user = User::find($userId);
        if (!$user) {
            return false;
        }

        if ($user->role === 'admin') {
            return true;
        }

        if ($album->creator_id === $userId) {
            return true;
        }

        $level = MemberLevel::find($user->member_level_id);
        $userLevel = $level ? $level->level : 0;

        return $album->min_level <= $userLevel;
    }

    private function checkTaskPermission(Request $request, PdfExportTask $task): bool
    {
        $userId = $request->uid;
        if (!$userId) {
            return false;
        }

        $user = User::find($userId);
        if (!$user) {
            return false;
        }

        if ($user->role === 'admin') {
            return true;
        }

        return $task->user_id === $userId;
    }
}
