<?php

namespace app\controller;

use app\model\PendingContent;
use app\model\Album;
use app\model\AlbumPage;
use app\model\Comment;
use app\model\User;
use think\Request;
use think\facade\Log;

class PendingContentController
{
    public function index(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $status = $request->get('status', PendingContent::STATUS_PENDING);
        $contentType = $request->get('content_type', '');

        $query = PendingContent::with(['submitter'])->order('created_at', 'desc');

        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($contentType !== '') {
            $query->where('content_type', $contentType);
        }

        $total = $query->count();
        $list = $query->page($page, $limit)->select()->each(function ($item) {
            $item->content_type_text = PendingContent::getTypeMap()[$item->content_type] ?? $item->content_type;
            $item->status_text = PendingContent::getStatusMap()[$item->status] ?? $item->status;

            if ($item->submitter) {
                $item->submitter_info = [
                    'id' => $item->submitter->id,
                    'nickname' => $item->submitter->nickname ?: $item->submitter->username,
                ];
            } else {
                $item->submitter_info = null;
            }
            unset($item->submitter);

            $item->target_link = $this->buildTargetLink($item->content_type, $item->target_id);
            $item->target_title = $this->getTargetTitle($item->content_type, $item->target_id);

            return $item;
        });

        return json_success([
            'list' => $list,
            'total' => $total,
            'page' => (int)$page,
            'limit' => (int)$limit,
            'type_map' => PendingContent::getTypeMap(),
            'status_map' => PendingContent::getStatusMap(),
        ]);
    }

    public function detail(Request $request, $id)
    {
        $content = PendingContent::with(['submitter', 'reviewer'])->find($id);
        if (!$content) {
            return json_error('待审内容不存在', 404);
        }

        $content->content_type_text = PendingContent::getTypeMap()[$content->content_type] ?? $content->content_type;
        $content->status_text = PendingContent::getStatusMap()[$content->status] ?? $content->status;

        if ($content->submitter) {
            $content->submitter_info = [
                'id' => $content->submitter->id,
                'nickname' => $content->submitter->nickname ?: $content->submitter->username,
            ];
        } else {
            $content->submitter_info = null;
        }

        if ($content->reviewer) {
            $content->reviewer_info = [
                'id' => $content->reviewer->id,
                'nickname' => $content->reviewer->nickname ?: $content->reviewer->username,
            ];
        } else {
            $content->reviewer_info = null;
        }

        unset($content->submitter);
        unset($content->reviewer);

        $content->target_link = $this->buildTargetLink($content->content_type, $content->target_id);
        $content->target_title = $this->getTargetTitle($content->content_type, $content->target_id);

        return json_success($content);
    }

    public function approve(Request $request, $id)
    {
        $content = PendingContent::find($id);
        if (!$content) {
            return json_error('待审内容不存在', 404);
        }
        if ($content->status !== PendingContent::STATUS_PENDING) {
            return json_error('该内容已处理过');
        }

        $data = getRequestData($request);
        $remark = $data['remark'] ?? '';

        $content->status = PendingContent::STATUS_APPROVED;
        $content->reviewer_id = $request->uid;
        $content->reviewed_at = date('Y-m-d H:i:s');
        $content->review_remark = $remark;
        $content->save();

        $this->applyContentChange($content, true);

        Log::info("管理员 {$request->uid} 通过待审内容: {$id}");

        return json_success([], '审核通过');
    }

    public function reject(Request $request, $id)
    {
        $content = PendingContent::find($id);
        if (!$content) {
            return json_error('待审内容不存在', 404);
        }
        if ($content->status !== PendingContent::STATUS_PENDING) {
            return json_error('该内容已处理过');
        }

        $data = getRequestData($request);
        $remark = $data['remark'] ?? '';

        $content->status = PendingContent::STATUS_REJECTED;
        $content->reviewer_id = $request->uid;
        $content->reviewed_at = date('Y-m-d H:i:s');
        $content->review_remark = $remark;
        $content->save();

        $this->applyContentChange($content, false);

        Log::info("管理员 {$request->uid} 驳回待审内容: {$id}");

        return json_success([], '已驳回');
    }

    public function batchApprove(Request $request)
    {
        $data = getRequestData($request);
        $ids = $data['ids'] ?? [];
        $remark = $data['remark'] ?? '';

        if (empty($ids) || !is_array($ids)) {
            return json_error('请选择要审核的内容');
        }

        $successCount = 0;
        $failCount = 0;

        foreach ($ids as $id) {
            $content = PendingContent::find($id);
            if (!$content || $content->status !== PendingContent::STATUS_PENDING) {
                $failCount++;
                continue;
            }

            $content->status = PendingContent::STATUS_APPROVED;
            $content->reviewer_id = $request->uid;
            $content->reviewed_at = date('Y-m-d H:i:s');
            $content->review_remark = $remark;
            $content->save();

            $this->applyContentChange($content, true);
            $successCount++;
        }

        Log::info("管理员 {$request->uid} 批量通过待审内容，成功{$successCount}条，失败{$failCount}条");

        return json_success([
            'success_count' => $successCount,
            'fail_count' => $failCount,
        ], '批量审核完成');
    }

    public function batchReject(Request $request)
    {
        $data = getRequestData($request);
        $ids = $data['ids'] ?? [];
        $remark = $data['remark'] ?? '';

        if (empty($ids) || !is_array($ids)) {
            return json_error('请选择要审核的内容');
        }

        $successCount = 0;
        $failCount = 0;

        foreach ($ids as $id) {
            $content = PendingContent::find($id);
            if (!$content || $content->status !== PendingContent::STATUS_PENDING) {
                $failCount++;
                continue;
            }

            $content->status = PendingContent::STATUS_REJECTED;
            $content->reviewer_id = $request->uid;
            $content->reviewed_at = date('Y-m-d H:i:s');
            $content->review_remark = $remark;
            $content->save();

            $this->applyContentChange($content, false);
            $successCount++;
        }

        Log::info("管理员 {$request->uid} 批量驳回待审内容，成功{$successCount}条，失败{$failCount}条");

        return json_success([
            'success_count' => $successCount,
            'fail_count' => $failCount,
        ], '批量审核完成');
    }

    public function stats()
    {
        $pendingCount = PendingContent::where('status', PendingContent::STATUS_PENDING)->count();
        $approvedCount = PendingContent::where('status', PendingContent::STATUS_APPROVED)->count();
        $rejectedCount = PendingContent::where('status', PendingContent::STATUS_REJECTED)->count();

        $todayStart = date('Y-m-d 00:00:00');
        $todayCount = PendingContent::where('created_at', '>=', $todayStart)->count();

        return json_success([
            'pending_count' => $pendingCount,
            'approved_count' => $approvedCount,
            'rejected_count' => $rejectedCount,
            'today_count' => $todayCount,
        ]);
    }

    private function buildTargetLink(string $contentType, int $targetId): string
    {
        switch ($contentType) {
            case PendingContent::TYPE_ALBUM_TITLE:
            case PendingContent::TYPE_ALBUM_DESCRIPTION:
                return "#/admin/albums/edit/{$targetId}";
            case PendingContent::TYPE_ALBUM_PAGE_TITLE:
            case PendingContent::TYPE_ALBUM_PAGE_DESCRIPTION:
                $page = AlbumPage::find($targetId);
                $albumId = $page ? $page->album_id : 0;
                return "#/admin/albums/edit/{$albumId}";
            case PendingContent::TYPE_COMMENT:
                return "#/admin/comments";
            default:
                return '';
        }
    }

    private function getTargetTitle(string $contentType, int $targetId): string
    {
        try {
            switch ($contentType) {
                case PendingContent::TYPE_ALBUM_TITLE:
                case PendingContent::TYPE_ALBUM_DESCRIPTION:
                    $album = Album::find($targetId);
                    return $album ? $album->title : '';
                case PendingContent::TYPE_ALBUM_PAGE_TITLE:
                case PendingContent::TYPE_ALBUM_PAGE_DESCRIPTION:
                    $page = AlbumPage::find($targetId);
                    if ($page) {
                        $album = Album::find($page->album_id);
                        return ($album ? $album->title : '') . ' - 第' . $page->page_number . '页';
                    }
                    return '';
                case PendingContent::TYPE_COMMENT:
                    $comment = Comment::find($targetId);
                    if ($comment) {
                        $album = Album::find($comment->album_id);
                        return '评论 - ' . ($album ? $album->title : '');
                    }
                    return '';
                default:
                    return '';
            }
        } catch (\Exception $e) {
            return '';
        }
    }

    private function applyContentChange(PendingContent $content, bool $approved): void
    {
        try {
            $newContent = $approved ? $content->original_content : $content->processed_content;

            switch ($content->content_type) {
                case PendingContent::TYPE_ALBUM_TITLE:
                    Album::where('id', $content->target_id)->update(['title' => $newContent]);
                    break;
                case PendingContent::TYPE_ALBUM_DESCRIPTION:
                    Album::where('id', $content->target_id)->update(['description' => $newContent]);
                    break;
                case PendingContent::TYPE_ALBUM_PAGE_TITLE:
                    AlbumPage::where('id', $content->target_id)->update(['title' => $newContent]);
                    break;
                case PendingContent::TYPE_ALBUM_PAGE_DESCRIPTION:
                    AlbumPage::where('id', $content->target_id)->update(['description' => $newContent]);
                    break;
                case PendingContent::TYPE_COMMENT:
                    Comment::where('id', $content->target_id)->update([
                        'content' => $newContent,
                        'status' => $approved ? Comment::STATUS_NORMAL : Comment::STATUS_HIDDEN,
                    ]);
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Apply pending content change failed: ' . $e->getMessage());
        }
    }
}
