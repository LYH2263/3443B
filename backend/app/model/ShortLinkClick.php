<?php

namespace app\model;

use think\Model;

class ShortLinkClick extends Model
{
    protected $table = 'short_link_clicks';
    protected $pk = 'id';
    protected $autoWriteTimestamp = false;
    protected $createTime = 'created_at';

    protected $type = [
        'id'            => 'integer',
        'short_link_id' => 'integer',
        'album_id'      => 'integer',
        'is_valid'      => 'integer',
    ];

    public function shortLink()
    {
        return $this->belongsTo(ShortLink::class, 'short_link_id', 'id');
    }
}
