<?php

use think\facade\Route;

// Short link redirect (public)
Route::get('s/:shortCode', 'app\controller\ShortLinkRedirectController@redirect')
    ->pattern(['shortCode' => '[a-zA-Z0-9_]{4,16}'])
    ->middleware(\app\middleware\CorsMiddleware::class);

// CORS preflight
Route::options('api/:any', function () {
    return response('', 204);
})->pattern(['any' => '.*']);

// Health check
Route::get('api/health', 'app\controller\InitController@health');

// Init (auto-called on startup, also callable manually)
Route::get('api/init', 'app\controller\InitController@init');

// Auth routes (public)
Route::group('api/auth', function () {
    Route::post('login', 'AuthController@login');
    Route::post('register', 'AuthController@register');
})->prefix('app\\controller\\')->middleware(\app\middleware\CorsMiddleware::class);

// Auth routes (require login)
Route::group('api/auth', function () {
    Route::get('profile', 'AuthController@profile');
    Route::put('profile', 'AuthController@updateProfile');
    Route::put('password', 'AuthController@changePassword');
})->prefix('app\\controller\\')->middleware([\app\middleware\CorsMiddleware::class, \app\middleware\AuthMiddleware::class]);

// Public routes (no auth required, but auth optional for level check)
Route::group('api/public', function () {
    Route::get('albums/:id', 'AlbumController@publicDetail')->pattern(['id' => '\d+']);
    Route::post('albums/:id/verify', 'AlbumController@publicDetail');
    Route::get('albums', 'AlbumController@publicList');
    Route::get('categories', 'AlbumController@categories');
    Route::get('tags/cloud', 'TagController@cloud');
    Route::get('tags/albums', 'TagController@publicAlbumsByTag');
    Route::get('albums/:id/recommend', 'TagController@recommend')->pattern(['id' => '\d+']);
    Route::get('ab-experiments', 'AbExperimentController@publicExperiments');
    Route::post('ab-experiments/assign', 'AbExperimentController@assign');
    Route::post('ab-experiments/exposure', 'AbExperimentController@recordExposure');
    Route::post('ab-experiments/click', 'AbExperimentController@recordClick');

    Route::get('albums/:albumId/comments', 'CommentController@index')->pattern(['albumId' => '\d+']);
    Route::get('comments/:commentId/replies', 'CommentController@getReplies')->pattern(['commentId' => '\d+']);
    Route::get('albums/:albumId/comments/count', 'CommentController@count')->pattern(['albumId' => '\d+']);
})->prefix('app\\controller\\')->middleware(\app\middleware\CorsMiddleware::class);

// Public comment routes (require login)
Route::group('api/public', function () {
    Route::post('comments', 'CommentController@store');
    Route::delete('comments/:id', 'CommentController@delete')->pattern(['id' => '\d+']);
})->prefix('app\\controller\\')->middleware([\app\middleware\CorsMiddleware::class, \app\middleware\AuthMiddleware::class]);

// Big screen data (public, for display)
Route::get('api/bigscreen', 'app\controller\BigScreenController@index')
    ->middleware(\app\middleware\CorsMiddleware::class);

// Upload routes (require login)
Route::group('api/upload', function () {
    Route::post('image', 'UploadController@image');
    Route::post('avatar', 'UploadController@avatar');
    Route::post('multi', 'UploadController@multiImage');
    Route::post('audio', 'UploadController@audio');
    Route::post('audio/delete', 'UploadController@deleteAudio');
})->prefix('app\\controller\\')->middleware([\app\middleware\CorsMiddleware::class, \app\middleware\AuthMiddleware::class]);

// Admin routes (require admin)
Route::group('api/admin', function () {
    // Dashboard
    Route::get('dashboard', 'DashboardController@stats');

    // Albums CRUD
    Route::get('albums/:id', 'AlbumController@detail')->pattern(['id' => '\d+']);
    Route::get('albums', 'AlbumController@index');
    Route::post('albums', 'AlbumController@store');
    Route::put('albums/:id', 'AlbumController@update');
    Route::delete('albums/:id', 'AlbumController@delete');

    // Album Pages
    Route::get('albums/:albumId/pages', 'AlbumPageController@index');
    Route::post('albums/:albumId/pages', 'AlbumPageController@store');
    Route::put('albums/:albumId/pages/:id', 'AlbumPageController@update');
    Route::delete('albums/:albumId/pages/:id', 'AlbumPageController@delete');
    Route::post('albums/:albumId/pages/sort', 'AlbumPageController@sort');

    // QR Code
    Route::post('qrcode/generate', 'QrcodeController@generate');

    // Users
    Route::get('users/:id', 'UserController@detail')->pattern(['id' => '\d+']);
    Route::get('users', 'UserController@index');
    Route::post('users', 'UserController@store');
    Route::put('users/:id', 'UserController@update');
    Route::delete('users/:id', 'UserController@delete');

    // Member Levels
    Route::post('levels', 'MemberLevelController@store');
    Route::get('levels', 'MemberLevelController@index');
    Route::put('levels/:id', 'MemberLevelController@update');
    Route::delete('levels/:id', 'MemberLevelController@delete');

    // Categories
    Route::post('categories', 'CategoryController@store');
    Route::get('categories', 'CategoryController@index');
    Route::put('categories/:id', 'CategoryController@update');
    Route::delete('categories/:id', 'CategoryController@delete');

    // Background Images
    Route::post('backgrounds', 'BackgroundImageController@store');
    Route::get('backgrounds', 'BackgroundImageController@index');
    Route::delete('backgrounds/:id', 'BackgroundImageController@delete');

    // A/B Experiments
    Route::get('ab-experiments', 'AbExperimentController@index');
    Route::get('ab-experiments/:id', 'AbExperimentController@detail')->pattern(['id' => '\d+']);
    Route::post('ab-experiments', 'AbExperimentController@store');
    Route::put('ab-experiments/:id', 'AbExperimentController@update');
    Route::post('ab-experiments/:id/adopt', 'AbExperimentController@adopt');
    Route::post('ab-experiments/:id/force-adopt', 'AbExperimentController@forceAdopt');
    Route::post('ab-experiments/:id/reset', 'AbExperimentController@reset');
    Route::delete('ab-experiments/:id', 'AbExperimentController@delete');

    // Short Links
    Route::get('short-links/all-stats', 'ShortLinkController@allStats');
    Route::get('short-links/stats', 'ShortLinkController@stats');
    Route::get('short-links', 'ShortLinkController@index');
    Route::post('short-links/generate', 'ShortLinkController@generate');
    Route::put('short-links/:id', 'ShortLinkController@update')->pattern(['id' => '\d+']);
    Route::delete('short-links/:id', 'ShortLinkController@delete')->pattern(['id' => '\d+']);

    // Tags
    Route::get('tags', 'TagController@index');
    Route::get('tags/autocomplete', 'TagController@autocomplete');
    Route::get('tags/:id', 'TagController@index');
    Route::delete('tags/:id', 'TagController@delete')->pattern(['id' => '\d+']);
    Route::get('albums/:albumId/tags', 'TagController@getAlbumTags')->pattern(['albumId' => '\d+']);
    Route::put('albums/:albumId/tags', 'TagController@syncAlbumTags')->pattern(['albumId' => '\d+']);

    // Comments
    Route::get('comments', 'AdminCommentController@index');
    Route::get('comments/:id', 'AdminCommentController@detail')->pattern(['id' => '\d+']);
    Route::put('comments/:id/status', 'AdminCommentController@updateStatus')->pattern(['id' => '\d+']);
    Route::post('comments/:id/toggle-pin', 'AdminCommentController@togglePin')->pattern(['id' => '\d+']);
    Route::delete('comments/:id', 'AdminCommentController@delete')->pattern(['id' => '\d+']);
    Route::get('comments/stats/overview', 'AdminCommentController@stats');
})->prefix('app\\controller\\')->middleware([\app\middleware\CorsMiddleware::class, \app\middleware\AdminMiddleware::class]);
