<?php
// Loaded first by every API endpoint: settings, database, helpers, error handling.
declare(strict_types=1);

const KWAME_APP = true;

require dirname(__DIR__) . '/config/config.php';
require dirname(__DIR__) . '/config/db.php';
require __DIR__ . '/helpers.php';

// Never print PHP errors into a JSON response; log them instead. Set up before
// anything else runs, so even a failure while loading settings answers in JSON.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_exception_handler(static function (Throwable $e): void {
    error_log('[kwame-api] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $payload = ['success' => false, 'message' => 'Something went wrong on our side. Please call or text us instead.'];
    try {
        if (app_config()['debug']) {
            $payload['debug'] = $e->getMessage();
        }
    } catch (Throwable) {
        // settings themselves failed to load: answer without debug details
    }
    json_response(500, $payload);
});

date_default_timezone_set(app_config()['timezone']);

send_security_headers();
handle_cors();
