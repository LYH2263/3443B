<?php

namespace app\controller;

use app\model\Comment;
use app\model\Album;
use app\model\User;
use think\Request;
use think\facade\Log;

class AdminCommentController
{
    public function index(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $albumId = $request->get('album_id', '');
        $userId = $request->get('user_id', '');
        $status = $request->get('status', '');
        $keyword = $request->get('keyword', '');

        $query = Comment::with(['user', 'album', 'parent']);

        if ($albumId !== '') {
            $query->where('album_id', $albumId);
        }
        if ($userId !== '') {
            $query->where('user_id', $userId);
        }
        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($keyword !== '') {
            $query->where('content', 'like', "%{$keyword}%");
        }

        $total = $query->count();
        $list = $query->order('is_pinned', 'desc')
            ->order('created_at', 'desc')
            ->page($page, $limit)
            ->select()
            ->each(function ($item) {
                $item = $this->formatAdminComment($item);
                return $item;
            });

        return json_success([
            'list' => $list,
            'total' => $total,
            'page' => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function detail(Request $request, $id)
    {
        $comment = Comment::with(['user', 'album', 'parent'])->find($id);
        if (!$comment) {
            return json_error('评论不存在', 404);
        }

        $comment = $this->formatAdminComment($comment);

        return json_success($comment);
    }

    public function updateStatus(Request $request, $id)
    {
        $comment = Comment::find($id);
        if (!$comment) {
            return json_error('评论不存在', 404);
        }

        $data = getRequestData($request);
        $status = $data['status'] ?? null;

        if ($status === null || !in_array((int)$status, [Comment::STATUS_NORMAL, Comment::STATUS_HIDDEN, Comment::STATUS_PENDING])) {
            return json_error('无效的状态值');
        }

        $comment->status = (int)$status;
        $comment->save();

        if ($comment->parent_id) {
            $parent = Comment::find($comment->parent_id);
            if ($parent) {
                $parent->reply_count = Comment::where('parent_id', $comment->parent_id)
                    ->where('status', Comment::STATUS_NORMAL)
                    ->count();
                $parent->save();
            }
        }

        Log::info("管理员更新评论状态: {$id} -> {$status} by user {$request->uid}");

        return json_success([], '状态更新成功');
    }

    public function togglePin(Request $request, $id)
    {
        $comment = Comment::find($id);
        if (!$comment) {
            return json_error('评论不存在', 404);
        }

        if ($comment->parent_id) {
            return json_error('仅顶层评论可置顶');
        }

        $comment->is_pinned = $comment->is_pinned ? 0 : 1;
        $comment->save();

        Log::info("管理员" . ($comment->is_pinned ? '置顶' : '取消置顶') . "评论: {$id} by user {$request->uid}");

        return json_success([
            'is_pinned' => (bool)$comment->is_pinned,
        ], ($comment->is_pinned ? '置顶' : '取消置顶') . '成功');
    }

    public function delete(Request $request, $id)
    {
        $comment = Comment::find($id);
        if (!$comment) {
            return json_error('评论不存在', 404);
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

        Log::info("管理员删除评论: {$id} on album {$albumId} by user {$request->uid}");

        return json_success([], '删除成功');
    }

    public function stats(Request $request)
    {
        $total = Comment::count();
        $normal = Comment::where('status', Comment::STATUS_NORMAL)->count();
        $hidden = Comment::where('status', Comment::STATUS_HIDDEN)->count();
        $pending = Comment::where('status', Comment::STATUS_PENDING)->count();
        $today = Comment::whereDate('created_at', date('Y-m-d'))->count();

        return json_success([
            'total' => $total,
            'normal' => $normal,
            'hidden' => $hidden,
            'pending' => $pending,
            'today' => $today,
        ]);
    }

    private function formatAdminComment($comment)
    {
        $user = $comment->user;
        if ($user) {
            $comment->user_info = [
                'id' => $user->id,
                'nickname' => $user->nickname ?: $user->username,
                'avatar' => $user->avatar ? get_upload_url($user->avatar) : '',
                'username' => $user->username,
            ];
        } else {
            $comment->user_info = [
                'id' => 0,
                'nickname' => '匿名用户',
                'avatar' => '',
                'username' => '',
            ];
        }

        $album = $comment->album;
        if ($album) {
            $comment->album_info = [
                'id' => $album->id,
                'title' => $album->title,
                'cover_image_url' => $album->cover_image ? get_upload_url($album->cover_image) : '',
            ];
        } else {
            $comment->album_info = null;
        }

        $parent = $comment->parent;
        if ($parent) {
            $parentUser = User::find($parent->user_id);
            $comment->parent_info = [
                'id' => $parent->id,
                'content' => $parent->content,
                'user_nickname' => $parentUser ? ($parentUser->nickname ?: $parentUser->username) : '匿名用户',
            ];
        } else {
            $comment->parent_info = null;
        }

        unset($comment->user);
        unset($comment->album);
        unset($comment->parent);

        return $comment;
    }
}
