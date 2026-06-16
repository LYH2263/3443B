<?php

namespace app\model;

use think\Model;

class AbExperiment extends Model
{
    protected $table = 'ab_experiments';
    protected $pk = 'id';
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'id'         => 'integer',
        'album_id'   => 'integer',
    ];

    public function album()
    {
        return $this->belongsTo(Album::class, 'album_id', 'id');
    }

    public function events()
    {
        return $this->hasMany(AbExperimentEvent::class, 'experiment_id', 'id');
    }

    public static function assignVariant($albumId, $fingerprint)
    {
        $hash = crc32($albumId . '_' . $fingerprint);
        return ($hash % 2 === 0) ? 'a' : 'b';
    }

    public function getStats()
    {
        $aExposures = AbExperimentEvent::where('experiment_id', $this->id)
            ->where('variant', 'a')
            ->where('event_type', 'exposure')
            ->count();

        $bExposures = AbExperimentEvent::where('experiment_id', $this->id)
            ->where('variant', 'b')
            ->where('event_type', 'exposure')
            ->count();

        $aClicks = AbExperimentEvent::where('experiment_id', $this->id)
            ->where('variant', 'a')
            ->where('event_type', 'click')
            ->count();

        $bClicks = AbExperimentEvent::where('experiment_id', $this->id)
            ->where('variant', 'b')
            ->where('event_type', 'click')
            ->count();

        $aCtr = $aExposures > 0 ? round($aClicks / $aExposures * 100, 2) : 0;
        $bCtr = $bExposures > 0 ? round($bClicks / $bExposures * 100, 2) : 0;

        $minSample = 100;
        $hasMinSample = $aExposures >= $minSample && $bExposures >= $minSample;

        $leader = null;
        if ($aCtr > $bCtr) {
            $leader = 'a';
        } elseif ($bCtr > $aCtr) {
            $leader = 'b';
        }

        $significant = false;
        if ($hasMinSample && $leader) {
            $significant = self::chiSquaredTest($aExposures, $aClicks, $bExposures, $bClicks);
        }

        return [
            'a_exposures'  => $aExposures,
            'b_exposures'  => $bExposures,
            'a_clicks'     => $aClicks,
            'b_clicks'     => $bClicks,
            'a_ctr'        => $aCtr,
            'b_ctr'        => $bCtr,
            'leader'       => $leader,
            'has_min_sample' => $hasMinSample,
            'significant'  => $significant,
        ];
    }

    public static function chiSquaredTest($aExp, $aClick, $bExp, $bClick)
    {
        if ($aExp == 0 || $bExp == 0) return false;

        $aNoClick = $aExp - $aClick;
        $bNoClick = $bExp - $bClick;
        $total = $aExp + $bExp;
        $totalClick = $aClick + $bClick;
        $totalNoClick = $aNoClick + $bNoClick;

        if ($totalClick == 0 || $totalNoClick == 0) return false;

        $expectedAClick = $aExp * $totalClick / $total;
        $expectedBClick = $bExp * $totalClick / $total;
        $expectedANoClick = $aExp * $totalNoClick / $total;
        $expectedBNoClick = $bExp * $totalNoClick / $total;

        if ($expectedAClick == 0 || $expectedBClick == 0 || $expectedANoClick == 0 || $expectedBNoClick == 0) return false;

        $chi2 = pow($aClick - $expectedAClick, 2) / $expectedAClick
              + pow($bClick - $expectedBClick, 2) / $expectedBClick
              + pow($aNoClick - $expectedANoClick, 2) / $expectedANoClick
              + pow($bNoClick - $expectedBNoClick, 2) / $expectedBNoClick;

        return $chi2 >= 3.841;
    }
}
