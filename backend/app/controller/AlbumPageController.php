<?php

namespace app\controller;

use app\model\Album;
use app\model\AlbumPage;
use app\model\PendingContent;
use app\service\SensitiveWordService;
use think\facade\Log;
use think\facade\Validate;
use think\Request;

class AlbumPageController
{
    public function index(Request $request, $albumId)
    {
        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        $pages = AlbumPage::where('album_id', $albumId)
            ->order('page_number', 'asc')
            ->select()
            ->each(function ($page) {
                $page->image_url = $page->image ? get_upload_url($page->image) : '';
                $page->narration_audio_url = $page->narration_audio ? get_upload_url($page->narration_audio) : '';
                return $page;
            });

        return json_success($pages);
    }

    public function store(Request $request, $albumId)
    {
        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        $data = $request->post();

        $validate = Validate::rule([
            'image' => 'require',
        ])->message([
            'image.require' => '页面图片不能为空',
        ]);

        if (!$validate->check($data)) {
            return json_error($validate->getError());
        }

        $sensitiveService = new SensitiveWordService();

        $title = $data['title'] ?? '';
        $titleResult = $sensitiveService->filterText(
            $title,
            PendingContent::TYPE_ALBUM_PAGE_TITLE,
            0,
            'title',
            $request->uid
        );
        if (!$titleResult['pass']) {
            return json_error($titleResult['error']);
        }

        $description = $data['description'] ?? '';
        $descResult = $sensitiveService->filterText(
            $description,
            PendingContent::TYPE_ALBUM_PAGE_DESCRIPTION,
            0,
            'description',
            $request->uid
        );
        if (!$descResult['pass']) {
            return json_error($descResult['error']);
        }

        $maxPage = AlbumPage::where('album_id', $albumId)->max('page_number') ?? 0;

        $page = new AlbumPage();
        $page->album_id = $albumId;
        $page->page_number = $data['page_number'] ?? ($maxPage + 1);
        $page->image = $data['image'];
        $page->title = $titleResult['content'];
        $page->description = $descResult['content'];
        $page->narration_audio = $data['narration_audio'] ?? '';
        $page->narration_duration = $data['narration_duration'] ?? 0;
        $page->sort_order = $data['sort_order'] ?? 0;
        $page->save();

        if ($titleResult['need_review']) {
            PendingContent::where('content_type', PendingContent::TYPE_ALBUM_PAGE_TITLE)
                ->where('target_id', 0)
                ->where('submitter_id', $request->uid)
                ->order('id', 'desc')
                ->limit(1)
                ->update(['target_id' => $page->id]);
        }
        if ($descResult['need_review']) {
            PendingContent::where('content_type', PendingContent::TYPE_ALBUM_PAGE_DESCRIPTION)
                ->where('target_id', 0)
                ->where('submitter_id', $request->uid)
                ->order('id', 'desc')
                ->limit(1)
                ->update(['target_id' => $page->id]);
        }

        $page->image_url = get_upload_url($page->image);
        $page->narration_audio_url = $page->narration_audio ? get_upload_url($page->narration_audio) : '';

        Log::info("添加画册页面: Album ID {$albumId}, Page {$page->page_number} by user {$request->uid}");

        return json_success([
            'page' => $page,
            'need_review' => $titleResult['need_review'] || $descResult['need_review'],
        ], '页面添加成功');
    }

    public function update(Request $request, $albumId, $id)
    {
        $page = AlbumPage::where('album_id', $albumId)->where('id', $id)->find();
        if (!$page) {
            return json_error('页面不存在', 404);
        }

        $data = getRequestData($request);

        $sensitiveService = new SensitiveWordService();
        $needReview = false;

        if (isset($data['title'])) {
            $titleResult = $sensitiveService->filterText(
                $data['title'],
                PendingContent::TYPE_ALBUM_PAGE_TITLE,
                $id,
                'title',
                $request->uid
            );
            if (!$titleResult['pass']) {
                return json_error($titleResult['error']);
            }
            $data['title'] = $titleResult['content'];
            if ($titleResult['need_review']) $needReview = true;
        }

        if (isset($data['description'])) {
            $descResult = $sensitiveService->filterText(
                $data['description'],
                PendingContent::TYPE_ALBUM_PAGE_DESCRIPTION,
                $id,
                'description',
                $request->uid
            );
            if (!$descResult['pass']) {
                return json_error($descResult['error']);
            }
            $data['description'] = $descResult['content'];
            if ($descResult['need_review']) $needReview = true;
        }

        $fields = ['page_number', 'image', 'title', 'description', 'narration_audio', 'narration_duration', 'sort_order'];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $page->$field = $data[$field];
            }
        }

        $page->save();
        $page->image_url = get_upload_url($page->image);
        $page->narration_audio_url = $page->narration_audio ? get_upload_url($page->narration_audio) : '';

        Log::info("更新画册页面: Album ID {$albumId}, Page ID {$id} by user {$request->uid}");

        return json_success([
            'page' => $page,
            'need_review' => $needReview,
        ], '页面更新成功');
    }

    public function delete(Request $request, $albumId, $id)
    {
        $page = AlbumPage::where('album_id', $albumId)->where('id', $id)->find();
        if (!$page) {
            return json_error('页面不存在', 404);
        }

        $pageNumber = $page->page_number;
        $page->delete();

        AlbumPage::where('album_id', $albumId)
            ->where('page_number', '>', $pageNumber)
            ->dec('page_number')
            ->update();

        Log::info("删除画册页面: Album ID {$albumId}, Page ID {$id} by user {$request->uid}");

        return json_success([], '页面删除成功');
    }

    public function sort(Request $request, $albumId)
    {
        $album = Album::find($albumId);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        $pages = $request->post('pages', []);
        if (empty($pages)) {
            return json_error('排序数据不能为空');
        }

        foreach ($pages as $index => $pageData) {
            AlbumPage::where('id', $pageData['id'])
                ->where('album_id', $albumId)
                ->update([
                    'page_number' => $index + 1,
                    'sort_order'  => $index,
                ]);
        }

        Log::info("排序画册页面: Album ID {$albumId} by user {$request->uid}");

        return json_success([], '排序更新成功');
    }
}
