<?php

namespace app\controller;

use app\model\ShortLink;
use app\model\ShortLinkClick;
use app\model\Album;
use think\facade\Log;
use think\facade\Db;
use think\Request;

class ShortLinkController
{
    public function generate(Request $request)
    {
        $data = getRequestData($request);
        $albumId = $data['album_id'] ?? 0;
        $remark = $data['remark'] ?? '';

        if (!$albumId) {
            return json_error('画册ID不能为空');
        }

        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        Db::startTrans();
        try {
            $shortCode = create_unique_short_code();

            $shortLink = new ShortLink();
            $shortLink->short_code = $shortCode;
            $shortLink->album_id = $albumId;
            $shortLink->remark = mb_substr($remark, 0, 200);
            $shortLink->status = 1;
            $shortLink->click_count = 0;
            $shortLink->creator_id = $request->uid;
            $shortLink->save();

            Db::commit();

            Log::info("生成短链: {$shortCode} for album {$albumId} by user {$request->uid}");

            $shortLink->short_url = get_short_link_url($shortCode);

            return json_success($shortLink, '短链生成成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('生成短链失败: ' . $e->getMessage());
            return json_error('生成短链失败，请重试');
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

        $query = ShortLink::with(['creator'])->where('album_id', $albumId);

        if ($status !== '') {
            $query->where('status', $status);
        }

        $total = $query->count();
        $list = $query->order('id', 'desc')
            ->page($page, $limit)
            ->select()
            ->each(function ($item) {
                $item->short_url = get_short_link_url($item->short_code);
                return $item;
            });

        return json_success([
            'list'  => $list,
            'total' => $total,
            'page'  => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function update(Request $request, $id)
    {
        $shortLink = ShortLink::find($id);
        if (!$shortLink) {
            return json_error('短链不存在', 404);
        }

        $data = getRequestData($request);

        if (isset($data['remark'])) {
            $shortLink->remark = mb_substr($data['remark'], 0, 200);
        }
        if (isset($data['status'])) {
            $shortLink->status = (int)$data['status'] === 1 ? 1 : 0;
        }

        $shortLink->save();

        Log::info("更新短链: {$shortLink->short_code} by user {$request->uid}");

        return json_success($shortLink, '更新成功');
    }

    public function delete(Request $request, $id)
    {
        $shortLink = ShortLink::find($id);
        if (!$shortLink) {
            return json_error('短链不存在', 404);
        }

        Db::startTrans();
        try {
            ShortLinkClick::where('short_link_id', $id)->delete();
            $shortLink->delete();

            Db::commit();

            Log::info("删除短链: {$shortLink->short_code} by user {$request->uid}");

            return json_success([], '删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('删除短链失败: ' . $e->getMessage());
            return json_error('删除失败');
        }
    }

    public function stats(Request $request)
    {
        $albumId = $request->get('album_id', 0);

        if (!$albumId) {
            return json_error('画册ID不能为空');
        }

        $model = new ShortLink();
        $channelStats = $model->getChannelStats($albumId);

        $totalClicks = array_sum(array_column($channelStats, 'total_clicks'));
        $totalUniqueIps = array_sum(array_column($channelStats, 'unique_ips'));

        $shortLinkStats = ShortLink::where('album_id', $albumId)
            ->field('status, COUNT(*) as count, SUM(click_count) as total_clicks')
            ->group('status')
            ->select()
            ->toArray();

        $stats = [
            'total_short_links' => ShortLink::where('album_id', $albumId)->count(),
            'total_clicks' => $totalClicks,
            'total_unique_ips' => $totalUniqueIps,
            'by_status' => $shortLinkStats,
            'by_channel' => $channelStats,
        ];

        return json_success($stats);
    }

    public function allStats(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $keyword = $request->get('keyword', '');

        $query = Album::with('category');

        if ($keyword !== '') {
            $query->where('title', 'like', "%{$keyword}%");
        }

        $total = $query->count();
        $albums = $query->order('id', 'desc')
            ->page($page, $limit)
            ->select()
            ->each(function ($album) {
                $shortLinkCount = ShortLink::where('album_id', $album->id)->count();
                $totalClicks = ShortLink::where('album_id', $album->id)->sum('click_count');
                $album->short_link_count = $shortLinkCount;
                $album->total_short_clicks = $totalClicks;
                return $album;
            });

        return json_success([
            'list'  => $albums,
            'total' => $total,
            'page'  => (int)$page,
            'limit' => (int)$limit,
        ]);
    }
}
