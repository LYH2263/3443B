<?php

namespace app\controller;

use app\model\ShareLink;
use app\model\Album;
use app\model\AccessLog;
use think\facade\Log;
use think\facade\Db;
use think\Request;

class ShareLinkAccessController
{
    public function access(Request $request, $token)
    {
        $token = preg_replace('/[^a-f0-9_]/', '', $token);

        if (empty($token) || strlen($token) < 16) {
            return $this->renderErrorPage('链接无效', '您访问的分享链接格式不正确。', 400);
        }

        $shareLink = ShareLink::findValidByToken($token);

        if (!$shareLink) {
            return $this->renderErrorPage('链接不存在', '您访问的分享链接不存在或已被删除。', 404);
        }

        if ($shareLink->status !== 1) {
            return $this->renderErrorPage('链接已失效', '该分享链接已被管理员停用。', 403);
        }

        if ($shareLink->isExpired()) {
            return $this->renderErrorPage('链接已过期', '该分享链接已超过有效期。', 410);
        }

        if ($shareLink->isMaxViewsReached()) {
            return $this->renderErrorPage('已达访问上限', '该分享链接的访问次数已达上限。', 429);
        }

        $album = Album::find($shareLink->album_id);

        if (!$album) {
            return $this->renderErrorPage('画册已删除', '该画册已被删除，无法继续访问。', 410);
        }

        if ($album->status !== 1) {
            return $this->renderErrorPage('画册未发布', '该画册尚未发布，暂时无法访问。', 403);
        }

        if (!empty($shareLink->access_code)) {
            $inputCode = $request->post('access_code', '') ?: $request->get('access_code', '');
            if (!$shareLink->verifyAccessCode($inputCode)) {
                return $this->renderAccessCodePage($shareLink, $album, $request->post('access_code') ? '访问码不正确' : '');
            }
        }

        Db::startTrans();
        try {
            $updated = ShareLink::where('id', $shareLink->id)
                ->where(function ($query) use ($shareLink) {
                    if ($shareLink->max_views > 0) {
                        $query->where('view_count', '<', $shareLink->max_views);
                    }
                })
                ->inc('view_count')
                ->update();

            if ($updated) {
                Album::where('id', $album->id)->inc('view_count')->update();

                AccessLog::create([
                    'album_id'   => $album->id,
                    'user_id'    => null,
                    'ip'         => $request->ip(),
                    'user_agent' => $request->header('user-agent', ''),
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }

            Db::commit();

            if (!$updated && $shareLink->max_views > 0) {
                return $this->renderErrorPage('已达访问上限', '该分享链接的访问次数已达上限。', 429);
            }
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('分享链接访问计数失败: ' . $e->getMessage());
        }

        $redirectUrl = '/#/viewer/' . $album->id . '?share_token=' . $shareLink->token;
        return redirect($redirectUrl, 302);
    }

    private function renderAccessCodePage($shareLink, $album, $errorMsg = '')
    {
        $coverUrl = $album->cover_image ? get_upload_url($album->cover_image) : '';
        $errorHtml = $errorMsg ? '<div style="color:#ef4444;font-size:14px;margin-bottom:16px">' . htmlspecialchars($errorMsg) . '</div>' : '';

        $html = '<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>需要访问码</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 48px 32px;
            text-align: center;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .cover {
            width: 120px;
            height: 160px;
            border-radius: 12px;
            margin: 0 auto 24px;
            overflow: hidden;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cover img { width: 100%; height: 100%; object-fit: cover; }
        .cover-placeholder { color: #9ca3af; font-size: 14px; }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .album-title {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 24px;
        }
        p {
            font-size: 15px;
            color: #6b7280;
            margin-bottom: 24px;
            line-height: 1.6;
        }
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        label {
            display: block;
            font-size: 14px;
            color: #374151;
            margin-bottom: 8px;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.2s;
        }
        input:focus {
            border-color: #667eea;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            border: none;
            text-decoration: none;
            font-weight: 500;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #6b7280;
            text-decoration: none;
            font-size: 14px;
        }
        .back-link:hover {
            color: #374151;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="cover">
            ' . ($coverUrl ? '<img src="' . htmlspecialchars($coverUrl) . '" alt="封面">' : '<div class="cover-placeholder">画册封面</div>') . '
        </div>
        <div class="icon">&#128274;</div>
        <h1>需要访问码</h1>
        <div class="album-title">' . htmlspecialchars($album->title) . '</div>
        <p>此分享链接需要输入访问码才能查看</p>
        ' . $errorHtml . '
        <form method="post">
            <div class="form-group">
                <label for="access_code">访问码</label>
                <input type="text" id="access_code" name="access_code" placeholder="请输入访问码" autofocus onkeydown="if(event.key===\'Enter\')this.form.submit()">
            </div>
            <button type="submit" class="btn">验证访问码</button>
        </form>
        <a href="/" class="back-link">&#8592; 返回首页</a>
    </div>
</body>
</html>';

        return response($html, 200)->contentType('text/html');
    }

    private function renderErrorPage($title, $message, $code = 404)
    {
        $iconMap = [
            400 => '&#9888;',
            403 => '&#128274;',
            404 => '&#128279;',
            410 => '&#128465;',
            429 => '&#9208;',
        ];
        $icon = $iconMap[$code] ?? '&#9888;';

        $html = '<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . htmlspecialchars($title) . '</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 48px 32px;
            text-align: center;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .icon {
            font-size: 72px;
            margin-bottom: 24px;
        }
        h1 {
            font-size: 28px;
            color: #1f2937;
            margin-bottom: 16px;
            font-weight: 600;
        }
        p {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 32px;
            line-height: 1.6;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }
        .code {
            display: inline-block;
            background: #f3f4f6;
            color: #9ca3af;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">' . $icon . '</div>
        <h1>' . htmlspecialchars($title) . '</h1>
        <p>' . htmlspecialchars($message) . '</p>
        <a href="/" class="btn">返回首页</a>
        <div class="code">错误代码: ' . $code . '</div>
    </div>
</body>
</html>';

        return response($html, $code)->contentType('text/html');
    }
}
