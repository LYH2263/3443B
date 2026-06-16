<?php

namespace app\model;

use think\Model;
use think\facade\Db;

class ShareLink extends Model
{
    protected $table = 'share_links';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'         => 'integer',
        'album_id'   => 'integer',
        'max_views'  => 'integer',
        'view_count' => 'integer',
        'status'     => 'integer',
        'creator_id' => 'integer',
    ];

    public function album()
    {
        return $this->belongsTo(Album::class, 'album_id', 'id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id', 'id');
    }

    public function isExpired(): bool
    {
        if ($this->expire_at === null) {
            return false;
        }
        return strtotime($this->expire_at) < time();
    }

    public function isMaxViewsReached(): bool
    {
        if ($this->max_views === 0) {
            return false;
        }
        return $this->view_count >= $this->max_views;
    }

    public function isValid(): bool
    {
        return $this->status === 1 && !$this->isExpired() && !$this->isMaxViewsReached();
    }

    public function verifyAccessCode(string $code): bool
    {
        if (empty($this->access_code)) {
            return true;
        }
        return $this->access_code === $code;
    }

    public static function generateSecureToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }

    public static function generateUniqueToken(int $maxRetries = 10, int $length = 32): string
    {
        for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
            $token = self::generateSecureToken($length);
            $exists = self::where('token', $token)->find();
            if (!$exists) {
                return $token;
            }
        }
        $token = self::generateSecureToken($length + 8) . '_' . time();
        return substr($token, 0, 64);
    }

    public static function findValidByToken(string $token): ?self
    {
        $shareLink = self::where('token', $token)->find();
        if (!$shareLink) {
            return null;
        }
        return $shareLink;
    }

    public static function incrementViewCount(int $id): bool
    {
        return self::where('id', $id)->inc('view_count')->update() > 0;
    }

    public static function cleanExpiredLinks(): int
    {
        return self::where(function ($query) {
            $query->where('expire_at', '<', date('Y-m-d H:i:s'))
                ->whereNotNull('expire_at');
        })->whereOr(function ($query) {
            $query->whereColumn('view_count', '>=', 'max_views')
                ->where('max_views', '>', 0);
        })->update(['status' => 0]);
    }
}
