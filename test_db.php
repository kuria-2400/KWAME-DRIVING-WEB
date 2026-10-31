<?php
// TEMPORARY local check: is PHP set up, can we reach MySQL, does the bookings table look right?
// Run:  php test_db.php            (terminal)
//  or:  http://localhost:8000/test_db.php   (while `php -S localhost:8000` is running)
// Only answers on this computer. Delete it before going live.
declare(strict_types=1);

$cli = PHP_SAPI === 'cli';
if (!$cli && !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
    http_response_code(404);
    exit;
}
if (!$cli) {
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
}

const KWAME_APP = true;

$failed = false;
function report(bool $ok, string $label, string $detail = ''): void
{
    global $failed;
    $failed = $failed || !$ok;
    echo ($ok ? '[ OK ] ' : '[FAIL] ') . $label . ($detail !== '' ? " - $detail" : '') . PHP_EOL;
}

echo 'Kwame booking backend: database check' . PHP_EOL . str_repeat('-', 40) . PHP_EOL;

// 1. PHP version and extensions
report(PHP_VERSION_ID >= 80100, 'PHP 8.1 or newer', PHP_VERSION);
foreach (['pdo_mysql', 'mbstring', 'json'] as $ext) {
    report(extension_loaded($ext), "Extension $ext", extension_loaded($ext) ? 'loaded' : 'enable it in php.ini (extension=' . $ext . ')');
}
if (!extension_loaded('pdo_mysql')) {
    echo PHP_EOL . 'Stopping: pdo_mysql is required to talk to MySQL.' . PHP_EOL;
    exit(1);
}

// 2. Settings
require __DIR__ . '/config/config.php';
require __DIR__ . '/config/db.php';

$envPath = getenv('ENV_PATH') ?: __DIR__ . '/.env';
report(is_readable($envPath), '.env file found', is_readable($envPath) ? $envPath : 'copy .env.example to .env and fill in DB_* values');
$db = app_config()['db'];
echo "       connecting as {$db['user']}@{$db['host']}:{$db['port']} to database '{$db['name']}'" . PHP_EOL;

// 3. Connection
try {
    $pdo = db();
    $version = (string) $pdo->query('SELECT VERSION()')->fetchColumn();
    report(true, 'Connected to MySQL', $version);
} catch (PDOException $e) {
    report(false, 'Connected to MySQL', $e->getMessage());
    echo PHP_EOL . 'Check that MySQL is running and the DB_* values in .env are right.' . PHP_EOL;
    exit(1);
}

// 4. Table and columns
$expected = ['id', 'reference', 'package', 'preferred_date', 'preferred_time', 'full_name', 'phone', 'email',
             'gender', 'id_number', 'message', 'status', 'ip_address', 'user_agent', 'created_at', 'updated_at'];
$exists = (bool) $pdo->query("SHOW TABLES LIKE 'bookings'")->fetchColumn();
report($exists, 'Table bookings exists', $exists ? '' : 'import schema.sql');
if ($exists) {
    $columns = $pdo->query('SHOW COLUMNS FROM bookings')->fetchAll(PDO::FETCH_COLUMN);
    $missing = array_diff($expected, $columns);
    report(!$missing, 'Table has all columns', $missing ? 'missing: ' . implode(', ', $missing) : count($columns) . ' columns');

    $count = (int) $pdo->query('SELECT COUNT(*) FROM bookings')->fetchColumn();
    echo "       bookings stored so far: $count" . PHP_EOL;
    if ($count > 0) {
        $last = $pdo->query('SELECT reference, full_name, package, created_at FROM bookings ORDER BY id DESC LIMIT 1')->fetch();
        echo "       latest: {$last['reference']}  {$last['full_name']}  ({$last['package']})  at {$last['created_at']} UTC" . PHP_EOL;
    }

    // 5. Prove writes work without leaving anything behind
    try {
        $pdo->beginTransaction();
        $pdo->prepare(
            "INSERT INTO bookings (reference, package, preferred_date, preferred_time, full_name, phone, email, gender, id_number, ip_address)
             VALUES ('KW-TEST0000', 'driving', CURDATE(), 'Morning', 'Test Student', '0712345678', 'test@example.com', 'Male', '12345678', '127.0.0.1')"
        )->execute();
        $pdo->rollBack();
        report(true, 'Can write to bookings', 'test row inserted and rolled back');
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        report(false, 'Can write to bookings', $e->getMessage());
    }
}

echo str_repeat('-', 40) . PHP_EOL . ($failed ? 'Some checks failed: see [FAIL] lines above.' : 'All good: the booking form can save to this database.') . PHP_EOL;
exit($failed ? 1 : 0);
