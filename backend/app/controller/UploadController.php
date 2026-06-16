<?php

namespace app\controller;

use think\facade\Log;
use think\facade\Validate;
use think\Request;

class UploadController
{
    private $allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    private $allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    private $maxImageSize = 10485760; // 10MB
    private $maxAudioSize = 52428800; // 50MB
    private $maxFileSize = 10485760; // 10MB

    public function image(Request $request)
    {
        $file = $request->file('file');
        if (!$file) {
            return json_error('请选择要上传的文件');
        }

        $validate = Validate::rule([
            'file' => 'fileSize:10485760|fileExt:jpg,jpeg,png,gif,webp',
        ])->message([
            'file.fileSize' => '文件大小不能超过10MB',
            'file.fileExt'  => '只支持 jpg、jpeg、png、gif、webp 格式',
        ]);

        if (!$validate->check(['file' => $file])) {
            return json_error($validate->getError());
        }

        $type = $request->post('type', 'albums');
        $allowedTypes = ['albums', 'avatars', 'backgrounds', 'logos', 'pages', 'qrcodes'];
        if (!in_array($type, $allowedTypes)) {
            $type = 'albums';
        }

        $savePath = app()->getRootPath() . 'public/uploads/' . $type . '/';
        if (!is_dir($savePath)) {
            mkdir($savePath, 0777, true);
        }

        $ext = $file->getOriginalExtension();
        $originalName = $file->getOriginalName();
        $fileSize = $file->getSize();
        $dateDir = date('Ymd');
        $hashName = md5(uniqid(mt_rand(), true)) . '.' . $ext;

        $datePath = $savePath . $dateDir . '/';
        if (!is_dir($datePath)) {
            mkdir($datePath, 0777, true);
        }

        $info = $file->move($datePath, $hashName);
        if ($info) {
            $relativePath = $type . '/' . $dateDir . '/' . $hashName;

            Log::info("文件上传成功: {$relativePath}");

            return json_success([
                'path' => $relativePath,
                'url'  => get_upload_url($relativePath),
                'name' => $originalName,
                'size' => $fileSize,
            ], '上传成功');
        }

        return json_error('文件上传失败，请稍后重试');
    }

    public function avatar(Request $request)
    {
        $request->withPost(['type' => 'avatars']);
        return $this->image($request);
    }

    public function multiImage(Request $request)
    {
        $files = $request->file('files');
        if (!$files || !is_array($files)) {
            return json_error('请选择要上传的文件');
        }

        if (count($files) > 20) {
            return json_error('一次最多上传20个文件');
        }

        $type = $request->post('type', 'pages');
        $results = [];
        $errors = [];

        foreach ($files as $index => $file) {
            $validate = Validate::rule([
                'file' => 'fileSize:10485760|fileExt:jpg,jpeg,png,gif,webp',
            ]);

            if (!$validate->check(['file' => $file])) {
                $errors[] = "第" . ($index + 1) . "个文件: " . $validate->getError();
                continue;
            }

            $savePath = app()->getRootPath() . 'public/uploads/' . $type . '/';
            if (!is_dir($savePath)) {
                mkdir($savePath, 0777, true);
            }

            $ext = $file->getOriginalExtension();
            $originalName = $file->getOriginalName();
            $fileSize = $file->getSize();
            $dateDir = date('Ymd');
            $hashName = md5(uniqid(mt_rand(), true)) . '.' . $ext;

            $datePath = $savePath . $dateDir . '/';
            if (!is_dir($datePath)) {
                mkdir($datePath, 0777, true);
            }

            $info = $file->move($datePath, $hashName);
            if ($info) {
                $relativePath = $type . '/' . $dateDir . '/' . $hashName;
                $results[] = [
                    'path' => $relativePath,
                    'url'  => get_upload_url($relativePath),
                    'name' => $originalName,
                    'size' => $fileSize,
                ];
            } else {
                $errors[] = "第" . ($index + 1) . "个文件上传失败";
            }
        }

        if (empty($results)) {
            return json_error('所有文件上传失败');
        }

        Log::info("批量上传文件: " . count($results) . " 个成功");

        return json_success([
            'files'  => $results,
            'errors' => $errors,
        ], count($errors) > 0 ? '部分文件上传成功' : '全部上传成功');
    }

    public function audio(Request $request)
    {
        $file = $request->file('file');
        if (!$file) {
            return json_error('请选择要上传的音频文件');
        }

        $validate = Validate::rule([
            'file' => 'fileSize:52428800|fileExt:mp3,wav,ogg,m4a,aac',
        ])->message([
            'file.fileSize' => '音频文件大小不能超过50MB',
            'file.fileExt'  => '只支持 mp3、wav、ogg、m4a、aac 格式',
        ]);

        if (!$validate->check(['file' => $file])) {
            return json_error($validate->getError());
        }

        $type = $request->post('type', 'bgm');
        $allowedTypes = ['bgm', 'narration'];
        if (!in_array($type, $allowedTypes)) {
            $type = 'bgm';
        }

        $savePath = app()->getRootPath() . 'public/uploads/audios/' . $type . '/';
        if (!is_dir($savePath)) {
            mkdir($savePath, 0777, true);
        }

        $ext = $file->getOriginalExtension();
        $originalName = $file->getOriginalName();
        $fileSize = $file->getSize();
        $dateDir = date('Ymd');
        $hashName = md5(uniqid(mt_rand(), true)) . '.' . $ext;

        $datePath = $savePath . $dateDir . '/';
        if (!is_dir($datePath)) {
            mkdir($datePath, 0777, true);
        }

        $info = $file->move($datePath, $hashName);
        if ($info) {
            $relativePath = 'audios/' . $type . '/' . $dateDir . '/' . $hashName;

            Log::info("音频上传成功: {$relativePath}");

            return json_success([
                'path' => $relativePath,
                'url'  => get_upload_url($relativePath),
                'name' => $originalName,
                'size' => $fileSize,
            ], '上传成功');
        }

        return json_error('音频文件上传失败，请稍后重试');
    }

    public function deleteAudio(Request $request)
    {
        $data = getRequestData($request);
        $path = $data['path'] ?? '';

        if (empty($path)) {
            return json_error('文件路径不能为空');
        }

        if (!str_starts_with($path, 'audios/')) {
            return json_error('无效的音频文件路径');
        }

        $fullPath = app()->getRootPath() . 'public/uploads/' . ltrim($path, '/');

        if (file_exists($fullPath)) {
            if (unlink($fullPath)) {
                Log::info("删除音频文件: {$path}");
                return json_success([], '删除成功');
            } else {
                return json_error('文件删除失败');
            }
        }

        return json_success([], '文件不存在或已删除');
    }
}
