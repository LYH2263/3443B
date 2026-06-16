<?php

namespace app\model;

use think\Model;

class SensitiveWord extends Model
{
    protected $table = 'sensitive_words';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'     => 'integer',
        'status' => 'integer',
    ];

    const LEVEL_FORBID = 'forbid';
    const LEVEL_REPLACE = 'replace';
    const LEVEL_MARK = 'mark';

    public static function getLevelMap(): array
    {
        return [
            self::LEVEL_FORBID => '禁止',
            self::LEVEL_REPLACE => '替换为星号',
            self::LEVEL_MARK => '标记待审',
        ];
    }

    public static function getAllActiveWords(): array
    {
        return self::where('status', 1)
            ->field('id, word, level, category')
            ->select()
            ->toArray();
    }
}
