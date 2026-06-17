<?php

return [
    'commands' => [
        'clean:share-links' => \app\command\CleanShareLinks::class,
        'clean:pdf-exports' => \app\command\CleanPdfExports::class,
    ],
];
