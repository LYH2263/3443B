<?php

namespace app\controller;

use app\model\AbExperiment;
use app\model\AbExperimentEvent;
use app\model\Album;
use think\facade\Log;
use think\facade\Validate;
use think\Request;

class AbExperimentController
{
    public function index(Request $request)
    {
        $status = $request->get('status', '');
        $albumId = $request->get('album_id', '');

        $query = AbExperiment::with(['album']);

        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($albumId !== '') {
            $query->where('album_id', $albumId);
        }

        $list = $query->order('id', 'desc')
            ->select()
            ->each(function ($item) {
                $this->appendExperimentInfo($item);
            });

        return json_success($list);
    }

    public function detail(Request $request, $id)
    {
        $experiment = AbExperiment::with(['album'])->find($id);
        if (!$experiment) {
            return json_error('实验不存在', 404);
        }

        $this->appendExperimentInfo($experiment);

        return json_success($experiment);
    }

    public function store(Request $request)
    {
        $data = getRequestData($request);

        $validate = Validate::rule([
            'album_id'       => 'require|integer',
            'cover_a_image'  => 'require',
            'cover_b_image'  => 'require',
        ])->message([
            'album_id.require'      => '画册ID不能为空',
            'cover_a_image.require' => '封面A不能为空',
            'cover_b_image.require' => '封面B不能为空',
        ]);

        if (!$validate->check($data)) {
            return json_error($validate->getError());
        }

        $album = Album::find($data['album_id']);
        if (!$album) {
            return json_error('画册不存在', 404);
        }

        $existing = AbExperiment::where('album_id', $data['album_id'])->find();
        if ($existing) {
            return json_error('该画册已有A/B实验，请先处理已有实验');
        }

        $experiment = new AbExperiment();
        $experiment->album_id = $data['album_id'];
        $experiment->cover_a_image = $data['cover_a_image'];
        $experiment->cover_b_image = $data['cover_b_image'];
        $experiment->status = 'running';
        $experiment->started_at = date('Y-m-d H:i:s');
        $experiment->save();

        Log::info("创建A/B实验: album_id={$data['album_id']} by user {$request->uid}");

        $this->appendExperimentInfo($experiment);

        return json_success($experiment, 'A/B实验创建成功');
    }

    public function update(Request $request, $id)
    {
        $experiment = AbExperiment::find($id);
        if (!$experiment) {
            return json_error('实验不存在', 404);
        }

        $data = getRequestData($request);

        if (isset($data['status'])) {
            $newStatus = $data['status'];
            if (!in_array($newStatus, ['running', 'paused'])) {
                return json_error('无效的实验状态');
            }
            if ($experiment->status === 'completed') {
                return json_error('已完成的实验不可修改状态');
            }
            $experiment->status = $newStatus;
        }

        $experiment->save();

        Log::info("更新A/B实验: id={$id} by user {$request->uid}");

        $this->appendExperimentInfo($experiment);

        return json_success($experiment, '实验更新成功');
    }

    public function adopt(Request $request, $id)
    {
        $experiment = AbExperiment::find($id);
        if (!$experiment) {
            return json_error('实验不存在', 404);
        }

        if ($experiment->status === 'completed') {
            return json_error('实验已完成');
        }

        $data = getRequestData($request);
        $winner = $data['winner'] ?? '';

        if (!in_array($winner, ['a', 'b'])) {
            return json_error('请指定胜出版本(a或b)');
        }

        $stats = $experiment->getStats();

        if (!$stats['has_min_sample']) {
            return json_error('样本量不足，每个版本至少需要100次曝光才能判定胜出');
        }

        $album = Album::find($experiment->album_id);
        if (!$album) {
            return json_error('关联画册不存在', 404);
        }

        $winningCover = $winner === 'a' ? $experiment->cover_a_image : $experiment->cover_b_image;
        $album->cover_image = $winningCover;
        $album->save();

        $experiment->winner = $winner;
        $experiment->status = 'completed';
        $experiment->ended_at = date('Y-m-d H:i:s');
        $experiment->save();

        Log::info("A/B实验采用封面{$winner}: experiment_id={$id}, album_id={$experiment->album_id} by user {$request->uid}");

        $this->appendExperimentInfo($experiment);

        return json_success($experiment, "已采用封面{$winner}并结束实验");
    }

    public function forceAdopt(Request $request, $id)
    {
        $experiment = AbExperiment::find($id);
        if (!$experiment) {
            return json_error('实验不存在', 404);
        }

        if ($experiment->status === 'completed') {
            return json_error('实验已完成');
        }

        $data = getRequestData($request);
        $winner = $data['winner'] ?? '';

        if (!in_array($winner, ['a', 'b'])) {
            return json_error('请指定胜出版本(a或b)');
        }

        $album = Album::find($experiment->album_id);
        if (!$album) {
            return json_error('关联画册不存在', 404);
        }

        $winningCover = $winner === 'a' ? $experiment->cover_a_image : $experiment->cover_b_image;
        $album->cover_image = $winningCover;
        $album->save();

        $experiment->winner = $winner;
        $experiment->status = 'completed';
        $experiment->ended_at = date('Y-m-d H:i:s');
        $experiment->save();

        Log::info("A/B实验强制采用封面{$winner}: experiment_id={$id}, album_id={$experiment->album_id} by user {$request->uid}");

        $this->appendExperimentInfo($experiment);

        return json_success($experiment, "已强制采用封面{$winner}并结束实验");
    }

    public function delete(Request $request, $id)
    {
        $experiment = AbExperiment::find($id);
        if (!$experiment) {
            return json_error('实验不存在', 404);
        }

        AbExperimentEvent::where('experiment_id', $id)->delete();
        $experiment->delete();

        Log::info("删除A/B实验: id={$id} by user {$request->uid}");

        return json_success([], '实验已删除');
    }

    public function reset(Request $request, $id)
    {
        $experiment = AbExperiment::find($id);
        if (!$experiment) {
            return json_error('实验不存在', 404);
        }

        if ($experiment->status === 'completed') {
            return json_error('已完成的实验不可重置数据');
        }

        AbExperimentEvent::where('experiment_id', $id)->delete();

        $experiment->started_at = date('Y-m-d H:i:s');
        $experiment->save();

        Log::info("重置A/B实验数据: id={$id} by user {$request->uid}");

        $this->appendExperimentInfo($experiment);

        return json_success($experiment, '实验数据已清零');
    }

    public function assign(Request $request)
    {
        $data = getRequestData($request);
        $albumId = $data['album_id'] ?? 0;
        $fingerprint = $data['fingerprint'] ?? '';

        if (empty($albumId) || empty($fingerprint)) {
            return json_error('参数不完整');
        }

        $experiment = AbExperiment::where('album_id', $albumId)
            ->where('status', 'running')
            ->find();

        if (!$experiment) {
            return json_error('没有进行中的实验', 404);
        }

        $variant = AbExperiment::assignVariant($albumId, $fingerprint);

        $coverImage = $variant === 'a' ? $experiment->cover_a_image : $experiment->cover_b_image;
        $coverImageUrl = $coverImage ? get_upload_url($coverImage) : '';

        return json_success([
            'experiment_id' => $experiment->id,
            'variant'       => $variant,
            'cover_image'   => $coverImage,
            'cover_image_url' => $coverImageUrl,
        ]);
    }

    public function recordExposure(Request $request)
    {
        $data = getRequestData($request);
        $experimentId = $data['experiment_id'] ?? 0;
        $fingerprint = $data['fingerprint'] ?? '';
        $variant = $data['variant'] ?? '';

        if (empty($experimentId) || empty($fingerprint) || empty($variant)) {
            return json_error('参数不完整');
        }

        if (!in_array($variant, ['a', 'b'])) {
            return json_error('无效的版本');
        }

        $experiment = AbExperiment::find($experimentId);
        if (!$experiment || $experiment->status !== 'running') {
            return json_error('实验不存在或未在运行中');
        }

        $existing = AbExperimentEvent::where('experiment_id', $experimentId)
            ->where('visitor_fingerprint', $fingerprint)
            ->where('event_type', 'exposure')
            ->find();

        if ($existing) {
            return json_success(['dedup' => true], '曝光已记录');
        }

        AbExperimentEvent::create([
            'experiment_id'      => $experimentId,
            'visitor_fingerprint' => $fingerprint,
            'event_type'         => 'exposure',
            'variant'            => $variant,
            'ip'                 => $request->ip(),
            'user_agent'         => $request->header('user-agent', ''),
        ]);

        return json_success(['dedup' => false], '曝光已记录');
    }

    public function recordClick(Request $request)
    {
        $data = getRequestData($request);
        $experimentId = $data['experiment_id'] ?? 0;
        $fingerprint = $data['fingerprint'] ?? '';
        $variant = $data['variant'] ?? '';

        if (empty($experimentId) || empty($fingerprint) || empty($variant)) {
            return json_error('参数不完整');
        }

        if (!in_array($variant, ['a', 'b'])) {
            return json_error('无效的版本');
        }

        $experiment = AbExperiment::find($experimentId);
        if (!$experiment || $experiment->status !== 'running') {
            return json_error('实验不存在或未在运行中');
        }

        $existing = AbExperimentEvent::where('experiment_id', $experimentId)
            ->where('visitor_fingerprint', $fingerprint)
            ->where('event_type', 'click')
            ->find();

        if ($existing) {
            return json_success(['dedup' => true], '点击已记录');
        }

        AbExperimentEvent::create([
            'experiment_id'      => $experimentId,
            'visitor_fingerprint' => $fingerprint,
            'event_type'         => 'click',
            'variant'            => $variant,
            'ip'                 => $request->ip(),
            'user_agent'         => $request->header('user-agent', ''),
        ]);

        return json_success(['dedup' => false], '点击已记录');
    }

    public function publicExperiments(Request $request)
    {
        $experiments = AbExperiment::where('status', 'running')
            ->field('id,album_id,cover_a_image,cover_b_image')
            ->select()
            ->each(function ($item) {
                $item->cover_a_image_url = $item->cover_a_image ? get_upload_url($item->cover_a_image) : '';
                $item->cover_b_image_url = $item->cover_b_image ? get_upload_url($item->cover_b_image) : '';
            });

        return json_success($experiments);
    }

    private function appendExperimentInfo(&$item)
    {
        $item->cover_a_image_url = $item->cover_a_image ? get_upload_url($item->cover_a_image) : '';
        $item->cover_b_image_url = $item->cover_b_image ? get_upload_url($item->cover_b_image) : '';

        if ($item->album) {
            $item->album_title = $item->album->title;
            $item->album_cover_url = $item->album->cover_image ? get_upload_url($item->album->cover_image) : '';
        }

        $stats = $item->getStats();
        $item->stats = $stats;
    }
}
