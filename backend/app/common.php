<?php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function json_success($data = [], string $message = '操作成功', int $code = 200): \think\response\Json
{
    return json([
        'code'    => $code,
        'message' => $message,
        'data'    => $data,
    ]);
}

function json_error(string $message = '操作失败', int $code = 400, $data = []): \think\response\Json
{
    return json([
        'code'    => $code,
        'message' => $message,
        'data'    => $data,
    ]);
}

function create_token(array $payload): string
{
    $key = env('JWT_SECRET', 'flipbook_jwt_secret_key_2024');
    $payload['iat'] = time();
    $payload['exp'] = time() + 86400 * 7;
    return JWT::encode($payload, $key, 'HS256');
}

function verify_token(string $token): ?array
{
    try {
        $key = env('JWT_SECRET', 'flipbook_jwt_secret_key_2024');
        $decoded = JWT::decode($token, new Key($key, 'HS256'));
        return (array) $decoded;
    } catch (\Exception $e) {
        return null;
    }
}

function getRequestData(\think\Request $request): array
{
    $data = $request->post();
    if (empty($data)) {
        $input = $request->getContent();
        if (!empty($input)) {
            $decoded = json_decode($input, true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }
    }
    return $data;
}

function get_upload_url(string $path): string
{
    if (empty($path)) {
        return '';
    }
    if (str_starts_with($path, 'http') || str_starts_with($path, '/')) {
        return $path;
    }
    return '/uploads/' . ltrim($path, '/');
}

function generate_short_code(int $length = 6): string
{
    $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    $charLength = strlen($chars);
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $chars[random_int(0, $charLength - 1)];
    }
    return $code;
}

function create_unique_short_code(int $maxRetries = 10, int $length = 6): string
{
    $existingLength = $length;
    for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
        $code = generate_short_code($existingLength);
        $exists = \app\model\ShortLink::where('short_code', $code)->find();
        if (!$exists) {
            return $code;
        }
        if ($attempt >= 5 && $existingLength < 10) {
            $existingLength++;
        }
    }
    $code = generate_short_code($length + 2) . '_' . time();
    return substr($code, 0, 16);
}

function is_valid_short_click(string $ip, int $shortLinkId, int $windowSeconds = 5): bool
{
    $threshold = date('Y-m-d H:i:s', time() - $windowSeconds);
    $count = \app\model\ShortLinkClick::where('short_link_id', $shortLinkId)
        ->where('ip', $ip)
        ->where('created_at', '>=', $threshold)
        ->count();
    return $count === 0;
}

function get_short_link_url(string $shortCode): string
{
    $baseUrl = env('SHORT_LINK_BASE_URL', '');
    if (empty($baseUrl)) {
        $baseUrl = request()->domain();
    }
    return rtrim($baseUrl, '/') . '/s/' . $shortCode;
}

function get_share_link_url(string $token): string
{
    $baseUrl = env('SHARE_LINK_BASE_URL', '');
    if (empty($baseUrl)) {
        $baseUrl = request()->domain();
    }
    return rtrim($baseUrl, '/') . '/share/' . $token;
}

function calculate_expire_at(?string $duration): ?string
{
    if ($duration === null || $duration === 'permanent') {
        return null;
    }
    $now = time();
    switch ($duration) {
        case '1h':
            return date('Y-m-d H:i:s', $now + 3600);
        case '1d':
            return date('Y-m-d H:i:s', $now + 86400);
        case '7d':
            return date('Y-m-d H:i:s', $now + 86400 * 7);
        default:
            if (is_numeric($duration)) {
                return date('Y-m-d H:i:s', $now + (int)$duration);
            }
            return null;
    }
}
