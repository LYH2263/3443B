<?php

namespace app\controller;

use app\model\ShareLink;
use app\model\Album;
use think\facade\Log;
use think\facade\Db;
use think\Request;

class ShareLinkController
{
    public function create(Request $request)
    {
        $data = getRequestData($request);
        $albumId = $data['album_id'] ?? 0;
        $duration = $data['duration'] ?? 'permanent';
        $maxViews = (int)($data['max_views'] ?? 0);
        $accessCode = $data['access_code'] ?? '';

        if (!$albumId) {
            return json_error('画册ID不能为空');
        }

        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        if (!in_array($duration, ['1h', '1d', '7d', 'permanent']) && !is_numeric($duration)) {
            return json_error('有效期参数无效');
        }

        if ($maxViews < 0) {
            return json_error('最大访问次数不能为负数');
        }

        if (mb_strlen($accessCode) > 50) {
            return json_error('访问码长度不能超过50个字符');
        }

        Db::startTrans();
        try {
            $token = ShareLink::generateUniqueToken();

            $shareLink = new ShareLink();
            $shareLink->album_id = $albumId;
            $shareLink->token = $token;
            $shareLink->expire_at = calculate_expire_at($duration);
            $shareLink->max_views = $maxViews;
            $shareLink->view_count = 0;
            $shareLink->access_code = $accessCode;
            $shareLink->status = 1;
            $shareLink->creator_id = $request->uid;
            $shareLink->save();

            Db::commit();

            Log::info("创建分享链接: token={$token} album={$albumId} by user {$request->uid}");

            $shareLink->share_url = get_share_link_url($token);
            $shareLink->is_expired = $shareLink->isExpired();
            $shareLink->is_max_views = $shareLink->isMaxViewsReached();

            return json_success($shareLink, '分享链接创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('创建分享链接失败: ' . $e->getMessage());
            return json_error('创建分享链接失败，请重试');
        }
    }

    public function index(Request $request)
    {
        $albumId = $request->get('album_id', 0);
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $status = $request->get('status', '');

        if (!$albumId) {
            return json_error('画册ID不能为空');
        }

        $query = ShareLink::with(['creator'])->where('album_id', $albumId);

        if ($status !== '') {
            $query->where('status', $status);
        }

        $total = $query->count();
        $list = $query->order('id', 'desc')
            ->page($page, $limit)
            ->select()
            ->each(function ($item) {
                $item->share_url = get_share_link_url($item->token);
                $item->is_expired = $item->isExpired();
                $item->is_max_views = $item->isMaxViewsReached();
                $item->has_access_code = !empty($item->access_code);
                unset($item->access_code);
                return $item;
            });

        return json_success([
            'list'  => $list,
            'total' => $total,
            'page'  => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function detail(Request $request, $id)
    {
        $shareLink = ShareLink::with(['creator', 'album'])->find($id);
        if (!$shareLink) {
            return json_error('分享链接不存在', 404);
        }

        $shareLink->share_url = get_share_link_url($shareLink->token);
        $shareLink->is_expired = $shareLink->isExpired();
        $shareLink->is_max_views = $shareLink->isMaxViewsReached();
        $shareLink->has_access_code = !empty($shareLink->access_code);
        unset($shareLink->access_code);

        return json_success($shareLink);
    }

    public function disable(Request $request, $id)
    {
        $shareLink = ShareLink::find($id);
        if (!$shareLink) {
            return json_error('分享链接不存在', 404);
        }

        $shareLink->status = 0;
        $shareLink->save();

        Log::info("失效分享链接: id={$id} token={$shareLink->token} by user {$request->uid}");

        return json_success([], '分享链接已失效');
    }

    public function delete(Request $request, $id)
    {
        $shareLink = ShareLink::find($id);
        if (!$shareLink) {
            return json_error('分享链接不存在', 404);
        }

        Db::startTrans();
        try {
            $shareLink->delete();
            Db::commit();

            Log::info("删除分享链接: id={$id} token={$shareLink->token} by user {$request->uid}");

            return json_success([], '删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('删除分享链接失败: ' . $e->getMessage());
            return json_error('删除失败');
        }
    }

    public function stats(Request $request)
    {
        $albumId = $request->get('album_id', 0);

        if (!$albumId) {
            return json_error('画册ID不能为空');
        }

        $total = ShareLink::where('album_id', $albumId)->count();
        $active = ShareLink::where('album_id', $albumId)->where('status', 1)->count();
        $totalViews = ShareLink::where('album_id', $albumId)->sum('view_count');

        $byStatus = ShareLink::where('album_id', $albumId)
            ->field('status, COUNT(*) as count')
            ->group('status')
            ->select()
            ->toArray();

        return json_success([
            'total'       => $total,
            'active'      => $active,
            'total_views' => (int)$totalViews,
            'by_status'   => $byStatus,
        ]);
    }

    public function cleanExpired()
    {
        try {
            $count = ShareLink::cleanExpiredLinks();
            Log::info("定时清理失效分享链接: 处理了 {$count} 条");
            return json_success(['cleaned' => $count], "已清理 {$count} 条失效链接");
        } catch (\Exception $e) {
            Log::error('清理失效分享链接失败: ' . $e->getMessage());
            return json_error('清理失败');
        }
    }
}
