<?php

namespace app\controller;

use app\model\Comment;
use app\model\Album;
use app\model\User;
use app\model\PendingContent;
use app\service\SensitiveWordService;
use think\Request;
use think\facade\Log;

class CommentController
{
    const MAX_CONTENT_LENGTH = 1000;
    const MIN_CONTENT_LENGTH = 1;
    const RATE_LIMIT_SECONDS = 10;
    const REPLIES_PER_PAGE = 5;

    public function index(Request $request, $albumId)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 10);
        $sort = $request->get('sort', 'time');

        $album = Album::find($albumId);
        if (!$album || $album->status !== 1) {
            return json_error('画册不存在或未发布', 404);
        }

        $query = Comment::with(['user', 'replyToUser'])
            ->where('album_id', $albumId)
            ->where('status', Comment::STATUS_NORMAL)
            ->whereNull('parent_id');

        if ($sort === 'hot') {
            $query->order('is_pinned', 'desc')
                ->order('like_count', 'desc')
                ->order('reply_count', 'desc')
                ->order('created_at', 'desc');
        } else {
            $query->order('is_pinned', 'desc')
                ->order('created_at', 'desc');
        }

        $total = $query->count();
        $list = $query->page($page, $limit)
            ->select()
            ->each(function ($item) {
                $item = $this->formatComment($item);
                $repliesQuery = Comment::with(['user', 'replyToUser'])
                    ->where('parent_id', $item->id)
                    ->where('status', Comment::STATUS_NORMAL)
                    ->order('created_at', 'asc');
                $replyTotal = $repliesQuery->count();
                $replies = $repliesQuery->limit(self::REPLIES_PER_PAGE)->select()
                    ->each(function ($reply) {
                        return $this->formatComment($reply);
                    });
                $item->replies = $replies;
                $item->reply_total = $replyTotal;
                $item->has_more_replies = $replyTotal > self::REPLIES_PER_PAGE;
                return $item;
            });

        $totalCount = Comment::getAlbumTotalCommentCount($albumId);

        return json_success([
            'list' => $list,
            'total' => $total,
            'total_count' => $totalCount,
            'page' => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function getReplies(Request $request, $commentId)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 10);

        $parent = Comment::find($commentId);
        if (!$parent || $parent->status !== Comment::STATUS_NORMAL) {
            return json_error('评论不存在', 404);
        }

        $query = Comment::with(['user', 'replyToUser'])
            ->where('parent_id', $commentId)
            ->where('status', Comment::STATUS_NORMAL)
            ->order('created_at', 'asc');

        $total = $query->count();
        $list = $query->page($page, $limit)
            ->select()
            ->each(function ($item) {
                return $this->formatComment($item);
            });

        return json_success([
            'list' => $list,
            'total' => $total,
            'page' => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function store(Request $request)
    {
        $userId = $request->uid;
        if (!$userId) {
            return json_error('请先登录', 401);
        }

        $data = getRequestData($request);
        $albumId = $data['album_id'] ?? 0;
        $content = $data['content'] ?? '';
        $parentId = $data['parent_id'] ?? null;
        $replyToUserId = $data['reply_to_user_id'] ?? null;

        $album = Album::find($albumId);
        if (!$album || $album->status !== 1) {
            return json_error('画册不存在或未发布', 404);
        }

        $content = trim($content);
        if (mb_strlen($content) < self::MIN_CONTENT_LENGTH) {
            return json_error('评论内容不能为空');
        }
        if (mb_strlen($content) > self::MAX_CONTENT_LENGTH) {
            return json_error('评论内容不能超过' . self::MAX_CONTENT_LENGTH . '个字符');
        }

        if (!$this->checkRateLimit($userId)) {
            return json_error('评论太频繁了，请稍后再试');
        }

        $parentComment = null;
        if ($parentId) {
            $parentComment = Comment::find($parentId);
            if (!$parentComment || $parentComment->status !== Comment::STATUS_NORMAL) {
                return json_error('回复的评论不存在');
            }
            if ($parentComment->parent_id) {
                return json_error('仅支持一层回复');
            }
            if ($parentComment->album_id != $albumId) {
                return json_error('评论与画册不匹配');
            }
        }

        $safeContent = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');

        $sensitiveService = new SensitiveWordService();
        $contentResult = $sensitiveService->filterText(
            $safeContent,
            PendingContent::TYPE_COMMENT,
            0,
            'content',
            $userId
        );
        if (!$contentResult['pass']) {
            return json_error($contentResult['error']);
        }

        $comment = new Comment();
        $comment->album_id = $albumId;
        $comment->user_id = $userId;
        $comment->parent_id = $parentId;
        $comment->reply_to_user_id = $replyToUserId;
        $comment->content = $contentResult['content'];
        $comment->status = $contentResult['need_review'] ? Comment::STATUS_PENDING : Comment::STATUS_NORMAL;
        $comment->save();

        if ($contentResult['need_review']) {
            PendingContent::where('content_type', PendingContent::TYPE_COMMENT)
                ->where('target_id', 0)
                ->where('submitter_id', $userId)
                ->order('id', 'desc')
                ->limit(1)
                ->update(['target_id' => $comment->id]);
        }

        if ($parentComment) {
            $parentComment->reply_count = Comment::where('parent_id', $parentId)
                ->where('status', Comment::STATUS_NORMAL)
                ->count();
            $parentComment->save();
        }

        $comment->load(['user', 'replyToUser']);
        $comment = $this->formatComment($comment);

        Log::info("用户 {$userId} 发表评论: {$comment->id} on album {$albumId}");

        return json_success([
            'comment' => $comment,
            'need_review' => $contentResult['need_review'],
        ], $contentResult['need_review'] ? '评论已提交，等待审核' : '评论发表成功');
    }

    public function delete(Request $request, $id)
    {
        $userId = $request->uid;
        if (!$userId) {
            return json_error('请先登录', 401);
        }

        $comment = Comment::find($id);
        if (!$comment) {
            return json_error('评论不存在', 404);
        }

        $user = User::find($userId);
        $isAdmin = $user && $user->role === 'admin';

        if ($comment->user_id != $userId && !$isAdmin) {
            return json_error('无权限删除此评论', 403);
        }

        $albumId = $comment->album_id;
        $parentId = $comment->parent_id;

        if ($comment->parent_id) {
            Comment::where('id', $id)->delete();
            $parent = Comment::find($parentId);
            if ($parent) {
                $parent->reply_count = Comment::where('parent_id', $parentId)
                    ->where('status', Comment::STATUS_NORMAL)
                    ->count();
                $parent->save();
            }
        } else {
            Comment::where('parent_id', $id)->delete();
            Comment::where('id', $id)->delete();
        }

        Log::info("用户 {$userId} 删除评论: {$id} on album {$albumId}");

        return json_success([], '删除成功');
    }

    public function count(Request $request, $albumId)
    {
        $count = Comment::getAlbumTotalCommentCount($albumId);
        return json_success(['count' => $count]);
    }

    private function formatComment($comment)
    {
        $user = $comment->user;
        if ($user) {
            $comment->user_info = [
                'id' => $user->id,
                'nickname' => $user->nickname ?: $user->username,
                'avatar' => $user->avatar ? get_upload_url($user->avatar) : '',
            ];
        } else {
            $comment->user_info = [
                'id' => 0,
                'nickname' => '匿名用户',
                'avatar' => '',
            ];
        }

        $replyToUser = $comment->replyToUser;
        if ($replyToUser) {
            $comment->reply_to_user_info = [
                'id' => $replyToUser->id,
                'nickname' => $replyToUser->nickname ?: $replyToUser->username,
            ];
        } else {
            $comment->reply_to_user_info = null;
        }

        unset($comment->user);
        unset($comment->replyToUser);

        return $comment;
    }

    private function checkRateLimit(int $userId): bool
    {
        $threshold = date('Y-m-d H:i:s', time() - self::RATE_LIMIT_SECONDS);
        $count = Comment::where('user_id', $userId)
            ->where('created_at', '>=', $threshold)
            ->count();
        return $count === 0;
    }
}
