<?php

namespace app\model;

use think\Model;

class AbExperimentEvent extends Model
{
    protected $table = 'ab_experiment_events';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = false;

    protected $type = [
        'id'             => 'integer',
        'experiment_id'  => 'integer',
    ];

    public function experiment()
    {
        return $this->belongsTo(AbExperiment::class, 'experiment_id', 'id');
    }
}
