<?php

namespace app\model;

use think\Model;

class SensitiveWhitelist extends Model
{
    protected $table = 'sensitive_whitelist';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'     => 'integer',
        'status' => 'integer',
    ];

    public static function getAllActiveWords(): array
    {
        return self::where('status', 1)
            ->column('word');
    }
}
