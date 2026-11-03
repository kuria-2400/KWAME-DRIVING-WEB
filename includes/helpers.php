<?php
// HTTP, security and input helpers shared by the API endpoints.
declare(strict_types=1);

if (!defined('KWAME_APP')) {
    http_response_code(403);
    exit;
}

/* ---------- Responses ---------- */

function json_response(int $status, array $payload): never
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function send_security_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store, max-age=0');
}

function require_method(string ...$allowed): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        json_response(405, ['success' => false, 'message' => 'Method not allowed.']);
    }
}

/* ---------- CORS ---------- */

function request_origin_allowed(string $origin): bool
{
    $origin = rtrim($origin, '/');
    if (in_array($origin, app_config()['allowed_origins'], true)) {
        return true;
    }
    // Same site: the Origin host matches the host this API is served from.
    $originHost = parse_url($origin, PHP_URL_HOST);
    $originPort = parse_url($origin, PHP_URL_PORT);
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return $originHost !== null && strcasecmp($originHost . ($originPort ? ":$originPort" : ''), $host) === 0;
}

/** Allow same-site and listed origins; reject everything else. Answers preflight requests. */
function handle_cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    header('Vary: Origin');

    if ($origin !== '') {
        if (!request_origin_allowed($origin)) {
            json_response(403, ['success' => false, 'message' => 'This origin is not allowed.']);
        }
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Accept, X-CSRF-Token');
        header('Access-Control-Max-Age: 600');
        http_response_code(204);
        exit;
    }
}

/* ---------- Session + CSRF ---------- */

function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_name('kwame_sid');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_start();
}

function csrf_token(): string
{
    start_secure_session();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/** Accepts the token from the X-CSRF-Token header or a csrf_token form field. */
function verify_csrf(array $input): void
{
    start_secure_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($input['csrf_token'] ?? '');
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!is_string($sent) || $expected === '' || !hash_equals($expected, $sent)) {
        json_response(403, [
            'success' => false,
            'message' => 'Your session expired. Please refresh the page and try again.',
        ]);
    }
}

/* ---------- Input ---------- */

/** POST body as an array: form-encoded / multipart via $_POST, or JSON. */
function request_input(int $maxBytes = 20000): array
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $maxBytes) {
        json_response(413, ['success' => false, 'message' => 'Request too large.']);
    }
    $type = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (str_starts_with($type, 'application/json')) {
        $data = json_decode((string) file_get_contents('php://input', false, null, 0, $maxBytes), true);
        if (!is_array($data)) {
            json_response(400, ['success' => false, 'message' => 'Invalid JSON body.']);
        }
        return $data;
    }
    return $_POST;
}

/** Trimmed single-line text with control characters removed. Non-strings become ''. */
function clean_line(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = preg_replace('/[\p{Cc}\p{Cf}]+/u', ' ', $value) ?? '';
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    return mb_substr($value, 0, $maxLength);
}

/** Like clean_line, but keeps line breaks (for messages). */
function clean_text(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[^\P{Cc}\n\t]+/u', '', $value) ?? '';
    $value = preg_replace("/\n{3,}/", "\n\n", $value) ?? '';
    return mb_substr(trim($value), 0, $maxLength);
}

/* ---------- Email ---------- */

/**
 * Plain-text UTF-8 email to the school via PHP mail(). Returns false if it couldn't be handed over.
 * Sets the envelope sender (-f) to MAIL_FROM so SPF/DKIM for the site's domain apply
 * and Gmail doesn't file the message as spam.
 */
function send_school_mail(string $subject, string $body, ?string $replyTo = null): bool
{
    $config = app_config();
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    $params = '';
    $from = $config['mail_from'];
    if ($from && filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'From: Kwame Website <' . $from . '>';
        $params = '-f' . $from;
    }
    // Callers pass only addresses that passed FILTER_VALIDATE_EMAIL, so no header line breaks.
    if ($replyTo) {
        $headers[] = "Reply-To: $replyTo";
    }
    return @mail((string) $config['mail_to'], mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers), $params);
}

/** Absolute URL of a file in /api, for links in emails. Uses APP_URL; falls back to this request's host for local testing. */
function api_url(string $file): string
{
    $base = app_config()['url'];
    if ($base === '') {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        $base = ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    }
    return "$base/api/$file";
}

function client_ip(): string
{
    // REMOTE_ADDR only: forwarded headers can be faked by the client.
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}
