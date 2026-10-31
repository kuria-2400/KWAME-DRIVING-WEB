<?php
// App settings, read from .env (kept out of Git) with safe production defaults.
declare(strict_types=1);

if (!defined('KWAME_APP')) {
    http_response_code(403);
    exit;
}

/** Load KEY=VALUE lines from a .env file without overwriting real environment variables. */
function load_env(string $path): void
{
    if (!is_readable($path)) {
        return;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $quote = $value[0] ?? '';
        if (strlen($value) >= 2 && ($quote === '"' || $quote === "'") && substr($value, -1) === $quote) {
            $value = substr($value, 1, -1);
        }
        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

function env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    load_env(env('ENV_PATH') ?? dirname(__DIR__) . '/.env');

    $config = [
        'env'      => env('APP_ENV', 'production'),
        'debug'    => env('APP_DEBUG', 'false') === 'true',
        'timezone' => env('APP_TIMEZONE', 'Africa/Nairobi'),
        'db' => [
            'host'    => env('DB_HOST', 'localhost'),
            'port'    => (int) env('DB_PORT', '3306'),
            'name'    => env('DB_NAME', 'kwame_school'),
            'user'    => env('DB_USER', 'root'),
            'pass'    => env('DB_PASS', ''),
            'charset' => 'utf8mb4',
        ],
        'allowed_origins' => array_values(array_filter(array_map(
            static fn (string $o): string => rtrim(trim($o), '/'),
            explode(',', env('ALLOWED_ORIGINS', ''))
        ))),
        'mail_to'    => env('MAIL_TO'),
        'mail_from'  => env('MAIL_FROM'),
        'rate_limit' => max(1, (int) env('RATE_LIMIT_PER_HOUR', '5')),
    ];
    return $config;
}
