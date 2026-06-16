<?php

namespace app\model;

use think\Model;

class Comment extends Model
{
    protected $table = 'comments';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'              => 'integer',
        'album_id'        => 'integer',
        'user_id'         => 'integer',
        'parent_id'       => 'integer',
        'reply_to_user_id' => 'integer',
        'status'          => 'integer',
        'is_pinned'       => 'integer',
        'like_count'      => 'integer',
        'reply_count'     => 'integer',
    ];

    const STATUS_NORMAL = 1;
    const STATUS_HIDDEN = 0;
    const STATUS_PENDING = 2;

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function replyToUser()
    {
        return $this->belongsTo(User::class, 'reply_to_user_id', 'id');
    }

    public function album()
    {
        return $this->belongsTo(Album::class, 'album_id', 'id');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id', 'id');
    }

    public function replies()
    {
        return $this->hasMany(self::class, 'parent_id', 'id')
            ->where('status', self::STATUS_NORMAL)
            ->order('created_at', 'asc');
    }

    public static function getAlbumCommentCount(int $albumId): int
    {
        return self::where('album_id', $albumId)
            ->where('status', self::STATUS_NORMAL)
            ->whereNull('parent_id')
            ->count();
    }

    public static function getAlbumTotalCommentCount(int $albumId): int
    {
        return self::where('album_id', $albumId)
            ->where('status', self::STATUS_NORMAL)
            ->count();
    }
}
