<?php

namespace app\model;

use think\Model;
use think\facade\Db;

class ShortLink extends Model
{
    protected $table = 'short_links';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'          => 'integer',
        'album_id'    => 'integer',
        'status'      => 'integer',
        'click_count' => 'integer',
        'creator_id'  => 'integer',
    ];

    public function album()
    {
        return $this->belongsTo(Album::class, 'album_id', 'id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id', 'id');
    }

    public function clicks()
    {
        return $this->hasMany(ShortLinkClick::class, 'short_link_id', 'id');
    }

    public function getChannelStats($albumId = null)
    {
        $query = Db::name('short_links')
            ->alias('sl')
            ->leftJoin('short_link_clicks slc', 'sl.id = slc.short_link_id')
            ->where('slc.is_valid', 1);

        if ($albumId) {
            $query->where('sl.album_id', $albumId);
        }

        return $query->field('sl.remark as channel, COUNT(DISTINCT slc.ip) as unique_ips, COUNT(slc.id) as total_clicks')
            ->where('sl.remark', '<>', '')
            ->group('sl.remark')
            ->order('total_clicks', 'desc')
            ->select()
            ->toArray();
    }
}
