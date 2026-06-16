<?php

namespace app\model;

use think\Model;

class PendingContent extends Model
{
    protected $table = 'pending_contents';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'            => 'integer',
        'target_id'     => 'integer',
        'submitter_id'  => 'integer',
        'reviewer_id'   => 'integer',
        'matched_words' => 'json',
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    const TYPE_ALBUM_TITLE = 'album_title';
    const TYPE_ALBUM_DESCRIPTION = 'album_description';
    const TYPE_ALBUM_PAGE_TITLE = 'album_page_title';
    const TYPE_ALBUM_PAGE_DESCRIPTION = 'album_page_description';
    const TYPE_COMMENT = 'comment';

    public static function getTypeMap(): array
    {
        return [
            self::TYPE_ALBUM_TITLE => '画册标题',
            self::TYPE_ALBUM_DESCRIPTION => '画册描述',
            self::TYPE_ALBUM_PAGE_TITLE => '页面标题',
            self::TYPE_ALBUM_PAGE_DESCRIPTION => '页面描述',
            self::TYPE_COMMENT => '评论内容',
        ];
    }

    public static function getStatusMap(): array
    {
        return [
            self::STATUS_PENDING => '待审',
            self::STATUS_APPROVED => '通过',
            self::STATUS_REJECTED => '驳回',
        ];
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitter_id', 'id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id', 'id');
    }
}
