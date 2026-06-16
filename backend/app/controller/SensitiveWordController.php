<?php

namespace app\controller;

use app\model\SensitiveWord;
use app\model\SensitiveWhitelist;
use app\service\SensitiveWordService;
use think\Request;
use think\facade\Log;

class SensitiveWordController
{
    public function index(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $keyword = $request->get('keyword', '');
        $level = $request->get('level', '');
        $status = $request->get('status', '');

        $query = SensitiveWord::order('id', 'desc');

        if ($keyword !== '') {
            $query->where('word', 'like', "%{$keyword}%");
        }
        if ($level !== '') {
            $query->where('level', $level);
        }
        if ($status !== '') {
            $query->where('status', (int)$status);
        }

        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        return json_success([
            'list' => $list,
            'total' => $total,
            'page' => (int)$page,
            'limit' => (int)$limit,
            'level_map' => SensitiveWord::getLevelMap(),
        ]);
    }

    public function detail(Request $request, $id)
    {
        $word = SensitiveWord::find($id);
        if (!$word) {
            return json_error('敏感词不存在', 404);
        }
        return json_success($word);
    }

    public function store(Request $request)
    {
        $data = getRequestData($request);
        $word = trim($data['word'] ?? '');
        $level = $data['level'] ?? SensitiveWord::LEVEL_FORBID;

        if (empty($word)) {
            return json_error('敏感词不能为空');
        }
        if (!in_array($level, [SensitiveWord::LEVEL_FORBID, SensitiveWord::LEVEL_REPLACE, SensitiveWord::LEVEL_MARK])) {
            return json_error('无效的级别');
        }

        $exists = SensitiveWord::where('word', $word)->find();
        if ($exists) {
            return json_error('该敏感词已存在');
        }

        $sensitiveWord = new SensitiveWord();
        $sensitiveWord->word = $word;
        $sensitiveWord->level = $level;
        $sensitiveWord->category = $data['category'] ?? '';
        $sensitiveWord->remark = $data['remark'] ?? '';
        $sensitiveWord->status = $data['status'] ?? 1;
        $sensitiveWord->save();

        $service = new SensitiveWordService();
        $service->refreshCache();

        Log::info("管理员 {$request->uid} 添加敏感词: {$word}");

        return json_success($sensitiveWord, '添加成功');
    }

    public function update(Request $request, $id)
    {
        $sensitiveWord = SensitiveWord::find($id);
        if (!$sensitiveWord) {
            return json_error('敏感词不存在', 404);
        }

        $data = getRequestData($request);
        $level = $data['level'] ?? null;

        if ($level !== null && !in_array($level, [SensitiveWord::LEVEL_FORBID, SensitiveWord::LEVEL_REPLACE, SensitiveWord::LEVEL_MARK])) {
            return json_error('无效的级别');
        }

        if (isset($data['word'])) {
            $newWord = trim($data['word']);
            if (empty($newWord)) {
                return json_error('敏感词不能为空');
            }
            $exists = SensitiveWord::where('word', $newWord)->where('id', '<>', $id)->find();
            if ($exists) {
                return json_error('该敏感词已存在');
            }
            $sensitiveWord->word = $newWord;
        }

        $fields = ['level', 'category', 'remark', 'status'];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $sensitiveWord->$field = $data[$field];
            }
        }

        $sensitiveWord->save();

        $service = new SensitiveWordService();
        $service->refreshCache();

        Log::info("管理员 {$request->uid} 更新敏感词: {$id}");

        return json_success($sensitiveWord, '更新成功');
    }

    public function delete(Request $request, $id)
    {
        $sensitiveWord = SensitiveWord::find($id);
        if (!$sensitiveWord) {
            return json_error('敏感词不存在', 404);
        }

        $word = $sensitiveWord->word;
        $sensitiveWord->delete();

        $service = new SensitiveWordService();
        $service->refreshCache();

        Log::info("管理员 {$request->uid} 删除敏感词: {$word} ({$id})");

        return json_success([], '删除成功');
    }

    public function batchImport(Request $request)
    {
        $data = getRequestData($request);
        $words = $data['words'] ?? [];
        $defaultLevel = $data['default_level'] ?? SensitiveWord::LEVEL_FORBID;
        $defaultCategory = $data['default_category'] ?? '';

        if (empty($words) || !is_array($words)) {
            return json_error('请提供要导入的敏感词列表');
        }

        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($words as $index => $item) {
            $word = is_array($item) ? trim($item['word'] ?? '') : trim($item);
            $level = is_array($item) ? ($item['level'] ?? $defaultLevel) : $defaultLevel;
            $category = is_array($item) ? ($item['category'] ?? $defaultCategory) : $defaultCategory;
            $remark = is_array($item) ? ($item['remark'] ?? '') : '';

            if (empty($word)) {
                $failCount++;
                $errors[] = "第" . ($index + 1) . "条：词为空";
                continue;
            }
            if (!in_array($level, [SensitiveWord::LEVEL_FORBID, SensitiveWord::LEVEL_REPLACE, SensitiveWord::LEVEL_MARK])) {
                $failCount++;
                $errors[] = "第" . ($index + 1) . "条：级别无效";
                continue;
            }

            $exists = SensitiveWord::where('word', $word)->find();
            if ($exists) {
                $failCount++;
                $errors[] = "第" . ($index + 1) . "条：【{$word}】已存在";
                continue;
            }

            try {
                $sensitiveWord = new SensitiveWord();
                $sensitiveWord->word = $word;
                $sensitiveWord->level = $level;
                $sensitiveWord->category = $category;
                $sensitiveWord->remark = $remark;
                $sensitiveWord->status = 1;
                $sensitiveWord->save();
                $successCount++;
            } catch (\Exception $e) {
                $failCount++;
                $errors[] = "第" . ($index + 1) . "条：保存失败 - " . $e->getMessage();
            }
        }

        $service = new SensitiveWordService();
        $service->refreshCache();

        Log::info("管理员 {$request->uid} 批量导入敏感词，成功{$successCount}条，失败{$failCount}条");

        return json_success([
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors,
        ], '导入完成');
    }

    public function refreshCache(Request $request)
    {
        $service = new SensitiveWordService();
        $service->refreshCache();
        return json_success([], '缓存刷新成功');
    }

    public function detect(Request $request)
    {
        $data = getRequestData($request);
        $text = $data['text'] ?? '';

        $service = new SensitiveWordService();
        $result = $service->detect($text);

        return json_success($result);
    }

    public function whitelistIndex(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $keyword = $request->get('keyword', '');

        $query = SensitiveWhitelist::order('id', 'desc');

        if ($keyword !== '') {
            $query->where('word', 'like', "%{$keyword}%");
        }

        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        return json_success([
            'list' => $list,
            'total' => $total,
            'page' => (int)$page,
            'limit' => (int)$limit,
        ]);
    }

    public function whitelistStore(Request $request)
    {
        $data = getRequestData($request);
        $word = trim($data['word'] ?? '');

        if (empty($word)) {
            return json_error('白名单词不能为空');
        }

        $exists = SensitiveWhitelist::where('word', $word)->find();
        if ($exists) {
            return json_error('该词已在白名单中');
        }

        $whitelist = new SensitiveWhitelist();
        $whitelist->word = $word;
        $whitelist->remark = $data['remark'] ?? '';
        $whitelist->status = $data['status'] ?? 1;
        $whitelist->save();

        $service = new SensitiveWordService();
        $service->refreshCache();

        Log::info("管理员 {$request->uid} 添加白名单词: {$word}");

        return json_success($whitelist, '添加成功');
    }

    public function whitelistUpdate(Request $request, $id)
    {
        $whitelist = SensitiveWhitelist::find($id);
        if (!$whitelist) {
            return json_error('白名单词不存在', 404);
        }

        $data = getRequestData($request);

        if (isset($data['word'])) {
            $newWord = trim($data['word']);
            if (empty($newWord)) {
                return json_error('白名单词不能为空');
            }
            $exists = SensitiveWhitelist::where('word', $newWord)->where('id', '<>', $id)->find();
            if ($exists) {
                return json_error('该词已在白名单中');
            }
            $whitelist->word = $newWord;
        }

        if (array_key_exists('remark', $data)) {
            $whitelist->remark = $data['remark'];
        }
        if (array_key_exists('status', $data)) {
            $whitelist->status = $data['status'];
        }

        $whitelist->save();

        $service = new SensitiveWordService();
        $service->refreshCache();

        Log::info("管理员 {$request->uid} 更新白名单词: {$id}");

        return json_success($whitelist, '更新成功');
    }

    public function whitelistDelete(Request $request, $id)
    {
        $whitelist = SensitiveWhitelist::find($id);
        if (!$whitelist) {
            return json_error('白名单词不存在', 404);
        }

        $word = $whitelist->word;
        $whitelist->delete();

        $service = new SensitiveWordService();
        $service->refreshCache();

        Log::info("管理员 {$request->uid} 删除白名单词: {$word} ({$id})");

        return json_success([], '删除成功');
    }

    public function stats()
    {
        $forbidCount = SensitiveWord::where('level', SensitiveWord::LEVEL_FORBID)->where('status', 1)->count();
        $replaceCount = SensitiveWord::where('level', SensitiveWord::LEVEL_REPLACE)->where('status', 1)->count();
        $markCount = SensitiveWord::where('level', SensitiveWord::LEVEL_MARK)->where('status', 1)->count();
        $whitelistCount = SensitiveWhitelist::where('status', 1)->count();

        return json_success([
            'forbid_count' => $forbidCount,
            'replace_count' => $replaceCount,
            'mark_count' => $markCount,
            'whitelist_count' => $whitelistCount,
            'total' => $forbidCount + $replaceCount + $markCount,
        ]);
    }
}
