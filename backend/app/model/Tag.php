<?php

namespace app\model;

use think\Model;

class Tag extends Model
{
    protected $table = 'tags';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'        => 'integer',
        'use_count' => 'integer',
    ];

    public function albums()
    {
        return $this->belongsToMany(Album::class, 'album_tag', 'album_id', 'tag_id');
    }

    public static function normalizeName(string $name): string
    {
        $name = preg_replace('/\s+/', '', $name);
        $name = mb_strtolower($name, 'UTF-8');
        return trim($name);
    }

    public static function findOrCreateByName(string $rawName): ?self
    {
        $slug = self::normalizeName($rawName);
        if (empty($slug)) {
            return null;
        }

        $tag = self::where('slug', $slug)->find();
        if ($tag) {
            return $tag;
        }

        $displayName = trim(preg_replace('/\s+/', ' ', $rawName));

        $tag = new self();
        $tag->name = $displayName;
        $tag->slug = $slug;
        $tag->use_count = 0;
        $tag->save();

        return $tag;
    }
}
