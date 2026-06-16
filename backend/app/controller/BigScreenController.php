<?php

namespace app\controller;

use app\model\Album;
use app\model\AlbumCategory;
use app\model\AccessLog;
use app\model\User;
use think\Request;
use think\facade\Cache;

class BigScreenController
{
    protected $cacheExpire = 30;

    public function index(Request $request)
    {
        $cacheKey = 'bigscreen_stats';
        $cached = Cache::get($cacheKey);

        if ($cached !== null) {
            return json_success($cached);
        }

        $data = [
            'online_count' => $this->getOnlineCount(),
            'today_trend'  => $this->getTodayTrend(),
            'top_albums'   => $this->getTopAlbums(),
            'recent_logs'  => $this->getRecentLogs(),
            'category_dist' => $this->getCategoryDistribution(),
            'cumulative'   => $this->getCumulativeStats(),
            'timestamp'    => time(),
        ];

        Cache::set($cacheKey, $data, $this->cacheExpire);

        return json_success($data);
    }

    protected function getOnlineCount()
    {
        $fiveMinutesAgo = date('Y-m-d H:i:s', time() - 300);
        $count = AccessLog::where('created_at', '>=', $fiveMinutesAgo)
            ->distinct(true)
            ->count('ip');

        return $count > 0 ? $count : 0;
    }

    protected function getTodayTrend()
    {
        $today = date('Y-m-d');
        $startOfDay = $today . ' 00:00:00';
        $endOfDay = $today . ' 23:59:59';

        $rows = AccessLog::whereBetween('created_at', [$startOfDay, $endOfDay])
            ->field('HOUR(created_at) as hour, COUNT(*) as count')
            ->group('hour')
            ->order('hour', 'asc')
            ->select()
            ->toArray();

        $trend = [];
        $currentHour = (int)date('H');

        for ($i = 0; $i <= $currentHour; $i++) {
            $count = 0;
            foreach ($rows as $row) {
                if ((int)$row['hour'] === $i) {
                    $count = (int)$row['count'];
                    break;
                }
            }
            $trend[] = [
                'hour'  => sprintf('%02d:00', $i),
                'count' => $count,
            ];
        }

        return $trend;
    }

    protected function getTopAlbums()
    {
        $albums = Album::with(['category'])
            ->where('status', 1)
            ->order('view_count', 'desc')
            ->limit(10)
            ->select()
            ->each(function ($item) {
                $item->cover_image_url = $item->cover_image ? get_upload_url($item->cover_image) : '';
                $item->category_name = $item->category ? $item->category->name : '未分类';
                return $item;
            })
            ->toArray();

        return $albums;
    }

    protected function getRecentLogs()
    {
        $logs = AccessLog::with(['album'])
            ->order('created_at', 'desc')
            ->limit(50)
            ->select()
            ->each(function ($item) {
                $item->album_title = $item->album ? $item->album->title : '未知画册';
                $item->time_text = $this->formatRelativeTime($item->created_at);
                return $item;
            })
            ->toArray();

        return $logs;
    }

    protected function getCategoryDistribution()
    {
        $categories = AlbumCategory::where('status', 1)
            ->order('sort_order', 'asc')
            ->select()
            ->toArray();

        $result = [];
        $total = 0;

        foreach ($categories as $cat) {
            $count = Album::where('category_id', $cat['id'])
                ->where('status', 1)
                ->count();
            $result[] = [
                'id'    => $cat['id'],
                'name'  => $cat['name'],
                'count' => $count,
            ];
            $total += $count;
        }

        $uncategorized = Album::whereNull('category_id')
            ->where('status', 1)
            ->count();

        if ($uncategorized > 0) {
            $result[] = [
                'id'    => 0,
                'name'  => '未分类',
                'count' => $uncategorized,
            ];
            $total += $uncategorized;
        }

        foreach ($result as &$item) {
            $item['percent'] = $total > 0 ? round(($item['count'] / $total) * 100, 1) : 0;
        }

        return $result;
    }

    protected function getCumulativeStats()
    {
        $albumCount = Album::count();
        $userCount = User::count();
        $totalViews = Album::sum('view_count');

        return [
            'album_count' => $albumCount,
            'user_count'  => $userCount,
            'total_views' => $totalViews,
        ];
    }

    protected function formatRelativeTime($datetime)
    {
        $timestamp = is_numeric($datetime) ? $datetime : strtotime($datetime);
        $diff = time() - $timestamp;

        if ($diff < 60) {
            return '刚刚';
        } elseif ($diff < 3600) {
            return floor($diff / 60) . '分钟前';
        } elseif ($diff < 86400) {
            return floor($diff / 3600) . '小时前';
        } else {
            return date('m-d H:i', $timestamp);
        }
    }
}
