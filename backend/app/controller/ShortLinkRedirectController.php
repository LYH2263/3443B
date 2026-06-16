<?php

namespace app\controller;

use app\model\ShortLink;
use app\model\ShortLinkClick;
use app\model\Album;
use think\facade\Log;
use think\facade\Db;
use think\Request;

class ShortLinkRedirectController
{
    public function redirect(Request $request, $shortCode)
    {
        $channel = $request->get('ch', '');
        $ip = $request->ip();
        $userAgent = $request->header('user-agent', '');
        $referer = $request->header('referer', '');

        $shortCode = preg_replace('/[^a-zA-Z0-9_]/', '', $shortCode);

        if (empty($shortCode) || strlen($shortCode) < 4) {
            return $this->renderErrorPage('链接无效', '您访问的短链接格式不正确。', 400);
        }

        $shortLink = ShortLink::where('short_code', $shortCode)->find();

        if (!$shortLink) {
            return $this->renderErrorPage('链接不存在', '您访问的短链接不存在或已被删除。', 404);
        }

        if ($shortLink->status !== 1) {
            return $this->renderErrorPage('链接已停用', '该短链接已被管理员停用，暂时无法访问。', 403);
        }

        $album = Album::find($shortLink->album_id);

        if (!$album) {
            return $this->renderErrorPage('画册已删除', '该画册已被删除，无法继续访问。', 410);
        }

        if ($album->status !== 1) {
            return $this->renderErrorPage('画册未发布', '该画册尚未发布，暂时无法访问。', 403);
        }

        $isValid = is_valid_short_click($ip, $shortLink->id, 5);

        Db::startTrans();
        try {
            $click = new ShortLinkClick();
            $click->short_link_id = $shortLink->id;
            $click->short_code = $shortCode;
            $click->album_id = $shortLink->album_id;
            $click->ip = $ip;
            $click->user_agent = substr($userAgent, 0, 500);
            $click->referer = substr($referer, 0, 500);
            $click->channel = substr($channel, 0, 100) ?: $shortLink->remark;
            $click->is_valid = $isValid ? 1 : 0;
            $click->save();

            if ($isValid) {
                ShortLink::where('id', $shortLink->id)
                    ->inc('click_count')
                    ->update([
                        'last_click_at' => date('Y-m-d H:i:s')
                    ]);
            }

            Db::commit();
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('记录短链点击失败: ' . $e->getMessage());
        }

        $redirectUrl = '/#/viewer/' . $album->id;
        return redirect($redirectUrl, 302);
    }

    private function renderErrorPage($title, $message, $code = 404)
    {
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
        <div class="icon">&#128279;</div>
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
