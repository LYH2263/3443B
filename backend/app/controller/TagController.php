<?php

namespace app\controller;

use app\model\Tag;
use app\model\AlbumTag;
use app\model\Album;
use app\model\AlbumPage;
use app\model\AccessLog;
use app\model\MemberLevel;
use app\model\User;
use think\facade\Db;
use think\Request;

class TagController
{
    public function index(Request $request)
    {
        $keyword = $request->get('keyword', '');
        $query = Tag::order('use_count', 'desc');

        if ($keyword !== '') {
            $query->where('name', 'like', "%{$keyword}%");
        }

        $tags = $query->select();
        return json_success($tags);
    }

    public function autocomplete(Request $request)
    {
        $q = $request->get('q', '');
        if ($q === '') {
            $tags = Tag::order('use_count', 'desc')->limit(20)->select();
            return json_success($tags);
        }

        $slug = Tag::normalizeName($q);
        $tags = Tag::where('slug', 'like', "{$slug}%")
            ->order('use_count', 'desc')
            ->limit(10)
            ->select();

        return json_success($tags);
    }

    public function cloud(Request $request)
    {
        $tags = Tag::where('use_count', '>', 0)
            ->order('use_count', 'desc')
            ->limit(50)
            ->select();

        $maxCount = $tags->max('use_count') ?: 1;
        $minCount = $tags->min('use_count') ?: 0;

        $tags->each(function ($tag) use ($maxCount, $minCount) {
            if ($maxCount == $minCount) {
                $tag->weight = 50;
            } else {
                $tag->weight = round(($tag->use_count - $minCount) / ($maxCount - $minCount) * 80 + 20);
            }
        });

        $shuffled = $tags->toArray();
        shuffle($shuffled);

        return json_success($shuffled);
    }

    public function syncAlbumTags(Request $request, $albumId)
    {
        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        $data = getRequestData($request);
        $tagNames = $data['tags'] ?? [];

        if (!is_array($tagNames)) {
            return json_error('标签格式不正确');
        }

        $tagNames = array_unique(array_filter(array_map(function ($name) {
            return trim($name);
        }, $tagNames)));

        if (count($tagNames) > 20) {
            return json_error('单个画册标签数不能超过20个');
        }

        $oldTagIds = AlbumTag::where('album_id', $albumId)->column('tag_id');

        Db::startTrans();
        try {
            AlbumTag::where('album_id', $albumId)->delete();

            foreach ($oldTagIds as $oldTid) {
                Tag::where('id', $oldTid)->dec('use_count')->update();
            }

            $newTagIds = [];
            foreach ($tagNames as $rawName) {
                $tag = Tag::findOrCreateByName($rawName);
                if ($tag) {
                    $newTagIds[] = $tag->id;
                    AlbumTag::create([
                        'album_id' => $albumId,
                        'tag_id'   => $tag->id,
                    ]);
                    Tag::where('id', $tag->id)->inc('use_count')->update();
                }
            }

            Db::commit();
        } catch (\Exception $e) {
            Db::rollback();
            return json_error('标签保存失败: ' . $e->getMessage());
        }

        $this->cleanupUnusedTags();

        $tags = Tag::whereIn('id', $newTagIds)->select();
        return json_success($tags, '标签更新成功');
    }

    public function getAlbumTags(Request $request, $albumId)
    {
        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        $tagIds = AlbumTag::where('album_id', $albumId)->column('tag_id');
        $tags = [];
        if (!empty($tagIds)) {
            $tags = Tag::whereIn('id', $tagIds)->select();
        }

        return json_success($tags);
    }

    public function recommend(Request $request, $albumId)
    {
        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        $limit = $request->get('limit', 6);
        $limit = min(max(intval($limit), 1), 20);

        $userLevel = 0;
        $token = $request->header('Authorization', '');
        if (str_starts_with($token, 'Bearer ')) {
            $token = substr($token, 7);
        }
        if (!empty($token)) {
            $payload = verify_token($token);
            if ($payload) {
                $user = User::find($payload['uid'] ?? 0);
                if ($user) {
                    $level = MemberLevel::find($user->member_level_id);
                    $userLevel = $level ? $level->level : 0;
                    if ($user->role === 'admin') {
                        $userLevel = 999;
                    }
                }
            }
        }

        $currentTagIds = AlbumTag::where('album_id', $albumId)->column('tag_id');

        $candidateQuery = Album::where('status', 1)
            ->where('min_level', '<=', $userLevel)
            ->where('id', '<>', $albumId);

        $candidates = $candidateQuery->select();

        if ($candidates->isEmpty()) {
            return json_success([]);
        }

        $scored = [];
        foreach ($candidates as $c) {
            $score = 0;

            if (!empty($currentTagIds)) {
                $cTagIds = AlbumTag::where('album_id', $c->id)->column('tag_id');
                $commonCount = count(array_intersect($currentTagIds, $cTagIds));
                $score += $commonCount * 40;

                $jaccardDenom = count(array_unique(array_merge($currentTagIds, $cTagIds)));
                if ($jaccardDenom > 0) {
                    $jaccard = $commonCount / $jaccardDenom;
                    $score += $jaccard * 20;
                }
            }

            if ($c->category_id && $album->category_id && $c->category_id == $album->category_id) {
                $score += 25;
            }

            $maxViews = 1000;
            $viewNorm = min($c->view_count / max($maxViews, 1), 1);
            $score += $viewNorm * 15;

            $scored[] = [
                'album' => $c,
                'score' => $score,
            ];
        }

        usort($scored, function ($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        $top = array_slice($scored, 0, $limit);

        $result = [];
        foreach ($top as $item) {
            $c = $item['album'];
            $cTagIds = AlbumTag::where('album_id', $c->id)->column('tag_id');
            $tags = [];
            if (!empty($cTagIds)) {
                $tags = Tag::whereIn('id', $cTagIds)->select()->toArray();
            }

            $result[] = [
                'id'                  => $c->id,
                'title'               => $c->title,
                'cover_image_url'     => $c->cover_image ? get_upload_url($c->cover_image) : '',
                'view_count'          => $c->view_count,
                'category_id'         => $c->category_id,
                'score'               => round($item['score'], 2),
                'tags'                => $tags,
                'page_count'          => AlbumPage::where('album_id', $c->id)->count(),
            ];
        }

        if (empty($result)) {
            $fallback = Album::where('status', 1)
                ->where('min_level', '<=', $userLevel)
                ->where('id', '<>', $albumId)
                ->order('view_count', 'desc')
                ->limit($limit)
                ->select();

            foreach ($fallback as $c) {
                $cTagIds = AlbumTag::where('album_id', $c->id)->column('tag_id');
                $tags = [];
                if (!empty($cTagIds)) {
                    $tags = Tag::whereIn('id', $cTagIds)->select()->toArray();
                }

                $result[] = [
                    'id'                  => $c->id,
                    'title'               => $c->title,
                    'cover_image_url'     => $c->cover_image ? get_upload_url($c->cover_image) : '',
                    'view_count'          => $c->view_count,
                    'category_id'         => $c->category_id,
                    'score'               => 0,
                    'tags'                => $tags,
                    'page_count'          => AlbumPage::where('album_id', $c->id)->count(),
                ];
            }
        }

        return json_success($result);
    }

    public function publicAlbumsByTag(Request $request)
    {
        $tagId = $request->get('tag_id', '');
        $tagSlug = $request->get('tag', '');
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 12);

        $userLevel = 0;
        $token = $request->header('Authorization', '');
        if (str_starts_with($token, 'Bearer ')) {
            $token = substr($token, 7);
        }
        if (!empty($token)) {
            $payload = verify_token($token);
            if ($payload) {
                $user = User::find($payload['uid'] ?? 0);
                if ($user) {
                    $level = MemberLevel::find($user->member_level_id);
                    $userLevel = $level ? $level->level : 0;
                    if ($user->role === 'admin') {
                        $userLevel = 999;
                    }
                }
            }
        }

        $tag = null;
        if ($tagId !== '') {
            $tag = Tag::find(intval($tagId));
        } elseif ($tagSlug !== '') {
            $slug = Tag::normalizeName($tagSlug);
            $tag = Tag::where('slug', $slug)->find();
        }

        if (!$tag) {
            return json_success(['list' => [], 'total' => 0, 'tag' => null, 'page' => (int)$page, 'limit' => (int)$limit]);
        }

        $albumIds = AlbumTag::where('tag_id', $tag->id)->column('album_id');

        if (empty($albumIds)) {
            return json_success(['list' => [], 'total' => 0, 'tag' => $tag, 'page' => (int)$page, 'limit' => (int)$limit]);
        }

        $query = Album::with(['category'])
            ->where('status', 1)
            ->where('min_level', '<=', $userLevel)
            ->whereIn('id', $albumIds);

        $total = $query->count();
        $list = $query->order('sort_order', 'asc')
            ->order('id', 'desc')
            ->page($page, $limit)
            ->select()
            ->each(function ($item) {
                $item->cover_image_url = $item->cover_image ? get_upload_url($item->cover_image) : '';
                $item->page_count = AlbumPage::where('album_id', $item->id)->count();
                unset($item->share_password);
                return $item;
            });

        return json_success([
            'list'  => $list,
            'total' => $total,
            'tag'   => $tag,
            'page'  => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function delete(Request $request, $id)
    {
        $tag = Tag::find($id);
        if (!$tag) {
            return json_error('标签不存在', 404);
        }

        AlbumTag::where('tag_id', $id)->delete();
        $tag->delete();

        return json_success([], '标签删除成功');
    }

    private function cleanupUnusedTags()
    {
        Tag::where('use_count', '<=', 0)->delete();
    }
}
