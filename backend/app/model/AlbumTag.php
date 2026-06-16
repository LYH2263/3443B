<?php

namespace app\model;

use think\Model;

class AlbumTag extends Model
{
    protected $table = 'album_tag';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = false;

    protected $type = [
        'id'       => 'integer',
        'album_id' => 'integer',
        'tag_id'   => 'integer',
    ];
}
