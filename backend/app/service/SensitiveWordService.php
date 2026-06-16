<?php

namespace app\service;

use app\model\SensitiveWord;
use app\model\SensitiveWhitelist;
use think\facade\Cache;
use think\facade\Log;

class SensitiveWordService
{
    const CACHE_KEY_DFA = 'sensitive_word_dfa_tree';
    const CACHE_KEY_WHITELIST = 'sensitive_word_whitelist';
    const CACHE_TTL = 86400;

    private $dfaTree = null;
    private $whitelist = [];

    private static $pinyinMap = [
        'a' => ['啊', '阿', '呵'],
        'b' => ['不', '被', '把'],
        'c' => ['操', '草', '册'],
        'd' => ['的', '大', '到'],
        'e' => ['恶', '额', '饿'],
        'f' => ['发', '法', '反'],
        'g' => ['个', '给', '更'],
        'h' => ['和', '会', '好'],
        'i' => [],
        'j' => ['就', '家', '将'],
        'k' => ['可', '看', '开'],
        'l' => ['了', '来', '里'],
        'm' => ['吗', '没', '们'],
        'n' => ['你', '那', '年'],
        'o' => ['哦', '噢', '喔'],
        'p' => ['平', '批', '评'],
        'q' => ['去', '其', '前'],
        'r' => ['人', '日', '如'],
        's' => ['是', '上', '说'],
        't' => ['他', '她', '它', '天'],
        'u' => [],
        'v' => [],
        'w' => ['我', '为', '无'],
        'x' => ['想', '下', '学'],
        'y' => ['一', '有', '也'],
        'z' => ['在', '这', '做'],
    ];

    public function __construct()
    {
        $this->loadDfaTree();
        $this->loadWhitelist();
    }

    private function loadDfaTree(): void
    {
        $tree = Cache::get(self::CACHE_KEY_DFA);
        if ($tree === null || empty($tree)) {
            $tree = $this->buildDfaTree();
            Cache::set(self::CACHE_KEY_DFA, $tree, self::CACHE_TTL);
        }
        $this->dfaTree = $tree;
    }

    private function loadWhitelist(): void
    {
        $list = Cache::get(self::CACHE_KEY_WHITELIST);
        if ($list === null) {
            $list = SensitiveWhitelist::getAllActiveWords();
            Cache::set(self::CACHE_KEY_WHITELIST, $list, self::CACHE_TTL);
        }
        $this->whitelist = $list;
    }

    public function refreshCache(): bool
    {
        Cache::delete(self::CACHE_KEY_DFA);
        Cache::delete(self::CACHE_KEY_WHITELIST);
        $this->dfaTree = $this->buildDfaTree();
        $this->whitelist = SensitiveWhitelist::getAllActiveWords();
        Cache::set(self::CACHE_KEY_DFA, $this->dfaTree, self::CACHE_TTL);
        Cache::set(self::CACHE_KEY_WHITELIST, $this->whitelist, self::CACHE_TTL);
        return true;
    }

    private function buildDfaTree(): array
    {
        $words = SensitiveWord::getAllActiveWords();
        $tree = [];

        foreach ($words as $item) {
            $word = $this->normalizeText($item['word']);
            if (empty($word)) continue;

            $chars = $this->mbStrSplit($word);
            $current = &$tree;

            foreach ($chars as $i => $char) {
                if (!isset($current[$char])) {
                    $current[$char] = [];
                }
                $current = &$current[$char];
            }
            $current['__end__'] = true;
            $current['__level__'] = $item['level'];
            $current['__word__'] = $item['word'];
        }

        return $tree;
    }

    private function normalizeText(string $text): string
    {
        if (empty($text)) return '';
        $text = $this->fullWidthToHalfWidth($text);
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);
        return $text;
    }

    private function fullWidthToHalfWidth(string $str): string
    {
        $arr = ['０' => '0', '１' => '1', '２' => '2', '３' => '3', '４' => '4',
                '５' => '5', '６' => '6', '７' => '7', '８' => '8', '９' => '9',
                'Ａ' => 'A', 'Ｂ' => 'B', 'Ｃ' => 'C', 'Ｄ' => 'D', 'Ｅ' => 'E',
                'Ｆ' => 'F', 'Ｇ' => 'G', 'Ｈ' => 'H', 'Ｉ' => 'I', 'Ｊ' => 'J',
                'Ｋ' => 'K', 'Ｌ' => 'L', 'Ｍ' => 'M', 'Ｎ' => 'N', 'Ｏ' => 'O',
                'Ｐ' => 'P', 'Ｑ' => 'Q', 'Ｒ' => 'R', 'Ｓ' => 'S', 'Ｔ' => 'T',
                'Ｕ' => 'U', 'Ｖ' => 'V', 'Ｗ' => 'W', 'Ｘ' => 'X', 'Ｙ' => 'Y',
                'Ｚ' => 'Z', 'ａ' => 'a', 'ｂ' => 'b', 'ｃ' => 'c', 'ｄ' => 'd',
                'ｅ' => 'e', 'ｆ' => 'f', 'ｇ' => 'g', 'ｈ' => 'h', 'ｉ' => 'i',
                'ｊ' => 'j', 'ｋ' => 'k', 'ｌ' => 'l', 'ｍ' => 'm', 'ｎ' => 'n',
                'ｏ' => 'o', 'ｐ' => 'p', 'ｑ' => 'q', 'ｒ' => 'r', 'ｓ' => 's',
                'ｔ' => 't', 'ｕ' => 'u', 'ｖ' => 'v', 'ｗ' => 'w', 'ｘ' => 'x',
                'ｙ' => 'y', 'ｚ' => 'z',
                '．' => '.', '，' => ',', '；' => ';', '：' => ':', '？' => '?',
                '！' => '!', '／' => '/', '＠' => '@', '＃' => '#', '＄' => '$',
                '％' => '%', '＾' => '^', '＆' => '&', '＊' => '*', '（' => '(',
                '）' => ')', '－' => '-', '＿' => '_', '＋' => '+', '＝' => '=',
                '［' => '[', '］' => ']', '｛' => '{', '｝' => '}', '＼' => '\\',
                '｜' => '|', '＂' => '"', '＇' => "'", '＜' => '<', '＞' => '>', '　' => ' '];
        return strtr($str, $arr);
    }

    private function mbStrSplit(string $string): array
    {
        $result = [];
        $len = mb_strlen($string, 'UTF-8');
        for ($i = 0; $i < $len; $i++) {
            $result[] = mb_substr($string, $i, 1, 'UTF-8');
        }
        return $result;
    }

    private function isNoiseChar(string $char): bool
    {
        if ($char === ' ' || $char === "\t" || $char === "\n" || $char === "\r") {
            return true;
        }
        if (preg_match('/^[\p{P}\p{S}]$/u', $char)) {
            return true;
        }
        return false;
    }

    private function isPinyinMatch(string $pinyinChar, string $chineseChar): bool
    {
        $lower = strtolower($pinyinChar);
        return isset(self::$pinyinMap[$lower]) && in_array($chineseChar, self::$pinyinMap[$lower], true);
    }

    public function detect(string $text): array
    {
        if (empty($text) || empty($this->dfaTree)) {
            return [
                'has_sensitive' => false,
                'forbid_words' => [],
                'replace_words' => [],
                'mark_words' => [],
                'processed_text' => $text,
            ];
        }

        $normalized = $this->normalizeText($text);
        $chars = $this->mbStrSplit($normalized);
        $charCount = count($chars);

        $forbidWords = [];
        $replaceWords = [];
        $markWords = [];
        $matches = [];

        $i = 0;
        while ($i < $charCount) {
            if ($this->isNoiseChar($chars[$i])) {
                $i++;
                continue;
            }

            $matched = $this->searchFromPosition($chars, $i, $charCount);
            if ($matched !== null) {
                $word = $matched['word'];
                if (!in_array($word, $this->whitelist, true)) {
                    $start = $i;
                    $end = $matched['end_index'];

                    $matchInfo = [
                        'word' => $word,
                        'level' => $matched['level'],
                        'start' => $start,
                        'end' => $end,
                        'matched_text' => implode('', array_slice($chars, $start, $end - $start + 1)),
                    ];

                    switch ($matched['level']) {
                        case SensitiveWord::LEVEL_FORBID:
                            $forbidWords[] = $matchInfo;
                            break;
                        case SensitiveWord::LEVEL_REPLACE:
                            $replaceWords[] = $matchInfo;
                            break;
                        case SensitiveWord::LEVEL_MARK:
                            $markWords[] = $matchInfo;
                            break;
                    }
                    $matches[] = $matchInfo;
                }
                $i = $matched['end_index'] + 1;
            } else {
                $i++;
            }
        }

        $processedText = $this->replaceSensitiveWords($normalized, array_merge($replaceWords, $markWords));

        return [
            'has_sensitive' => !empty($matches),
            'has_forbid' => !empty($forbidWords),
            'has_replace' => !empty($replaceWords),
            'has_mark' => !empty($markWords),
            'forbid_words' => $forbidWords,
            'replace_words' => $replaceWords,
            'mark_words' => $markWords,
            'processed_text' => $processedText,
            'original_text' => $text,
        ];
    }

    private function searchFromPosition(array $chars, int $start, int $charCount): ?array
    {
        $current = &$this->dfaTree;
        $i = $start;
        $found = null;
        $noiseCount = 0;
        $maxNoise = 3;

        while ($i < $charCount) {
            $char = $chars[$i];

            if ($this->isNoiseChar($char)) {
                if ($noiseCount >= $maxNoise) break;
                $noiseCount++;
                $i++;
                continue;
            }

            if (isset($current[$char])) {
                $current = &$current[$char];
                $noiseCount = 0;
                if (isset($current['__end__'])) {
                    $found = [
                        'word' => $current['__word__'],
                        'level' => $current['__level__'],
                        'end_index' => $i,
                    ];
                }
                $i++;
                continue;
            }

            $lowerChar = strtolower($char);
            if (ctype_alpha($lowerChar)) {
                $foundPinyin = false;
                foreach ($current as $key => $node) {
                    if ($key !== '__end__' && $key !== '__level__' && $key !== '__word__') {
                        if ($this->isPinyinMatch($lowerChar, $key)) {
                            $current = &$current[$key];
                            $foundPinyin = true;
                            $noiseCount = 0;
                            if (isset($current['__end__'])) {
                                $found = [
                                    'word' => $current['__word__'],
                                    'level' => $current['__level__'],
                                    'end_index' => $i,
                                ];
                            }
                            $i++;
                            break;
                        }
                    }
                }
                if ($foundPinyin) continue;
            }

            break;
        }

        return $found;
    }

    private function replaceSensitiveWords(string $text, array $words): string
    {
        if (empty($words)) return $text;

        usort($words, function ($a, $b) {
            return $b['start'] - $a['start'];
        });

        $chars = $this->mbStrSplit($text);

        foreach ($words as $word) {
            $len = $word['end'] - $word['start'] + 1;
            $replacement = str_repeat('*', $len);
            array_splice($chars, $word['start'], $len, $this->mbStrSplit($replacement));
        }

        return implode('', $chars);
    }

    public function filterText(string $text, string $contentType, int $targetId, string $fieldName, ?int $submitterId = null): array
    {
        $result = $this->detect($text);

        if (!$result['has_sensitive']) {
            return [
                'pass' => true,
                'need_review' => false,
                'content' => $text,
                'matched' => [],
            ];
        }

        if ($result['has_forbid']) {
            return [
                'pass' => false,
                'need_review' => false,
                'content' => $text,
                'matched' => $result['forbid_words'],
                'error' => '内容包含禁止的敏感词：' . implode('、', array_column($result['forbid_words'], 'word')),
            ];
        }

        $finalContent = $result['processed_text'];
        $needReview = $result['has_mark'];

        $allMatched = array_merge($result['replace_words'], $result['mark_words']);

        if ($needReview) {
            $this->createPendingContent(
                $contentType,
                $targetId,
                $fieldName,
                $text,
                $finalContent,
                $allMatched,
                $submitterId
            );
        }

        return [
            'pass' => true,
            'need_review' => $needReview,
            'content' => $finalContent,
            'matched' => $allMatched,
        ];
    }

    private function createPendingContent(
        string $contentType,
        int $targetId,
        string $fieldName,
        string $originalContent,
        string $processedContent,
        array $matchedWords,
        ?int $submitterId
    ): void {
        try {
            \app\model\PendingContent::create([
                'content_type'      => $contentType,
                'target_id'         => $targetId,
                'field_name'        => $fieldName,
                'original_content'  => $originalContent,
                'processed_content' => $processedContent,
                'matched_words'     => $matchedWords,
                'submitter_id'      => $submitterId,
                'status'            => \app\model\PendingContent::STATUS_PENDING,
            ]);
        } catch (\Exception $e) {
            Log::error('Create pending content failed: ' . $e->getMessage());
        }
    }
}
