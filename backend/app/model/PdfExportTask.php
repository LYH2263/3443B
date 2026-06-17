<?php

namespace app\model;

use think\Model;

class PdfExportTask extends Model
{
    protected $table = 'pdf_export_tasks';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'              => 'integer',
        'album_id'        => 'integer',
        'user_id'         => 'integer',
        'progress'        => 'integer',
        'total_pages'     => 'integer',
        'processed_pages' => 'integer',
        'show_header'     => 'boolean',
        'show_footer'     => 'boolean',
        'file_size'       => 'integer',
        'retry_count'     => 'integer',
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_TIMEOUT = 'timeout';

    const PAGE_SIZE_A4_PORTRAIT = 'a4_portrait';
    const PAGE_SIZE_A4_LANDSCAPE = 'a4_landscape';
    const PAGE_SIZE_ORIGINAL = 'original';

    public function album()
    {
        return $this->belongsTo(Album::class, 'album_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function getFileUrlAttr()
    {
        if (empty($this->file_path)) {
            return '';
        }
        return get_upload_url($this->file_path);
    }

    public function getDownloadUrlAttr()
    {
        return url('pdf/download', ['id' => $this->id])->build();
    }

    public function canRetry()
    {
        return $this->status === self::STATUS_FAILED && $this->retry_count < 3;
    }

    public function isExpired()
    {
        if ($this->status !== self::STATUS_COMPLETED) {
            return false;
        }
        if ($this->expires_at === null) {
            return false;
        }
        return strtotime($this->expires_at) < time();
    }
}
