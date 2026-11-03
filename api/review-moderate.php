<?php
// /api/review-moderate.php?id=…&token=…: the approve/reject link from the "New review" email.
//   GET  shows the review with Approve / Reject buttons (changes nothing, so email link
//        scanners that open the link can't publish or delete a review).
//   POST action=approve|reject sets the review's status.
// The 64-character token from the email is the only key, so keep those emails private.
declare(strict_types=1);

require dirname(__DIR__) . '/includes/bootstrap.php';

require_method('GET', 'POST');

header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function page(int $status, string $title, string $body): never
{
    http_response_code($status);
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">'
        . '<title>' . h($title) . ' · Kwame reviews</title><style>'
        . 'body{font-family:system-ui,sans-serif;background:#eef7fc;color:#1f2328;margin:0;padding:40px 16px}'
        . 'main{max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,.08)}'
        . 'h1{font-size:1.4rem;margin:0 0 16px}.stars{color:#0872a8;font-size:1.3rem;letter-spacing:3px}'
        . 'blockquote{margin:12px 0;font-size:1.1rem;line-height:1.5}.muted{color:#5f6368}'
        . '.actions{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}'
        . 'button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:12px 24px;cursor:pointer}'
        . '.ok{background:#1f9d55;color:#fff}.no{background:#fdecec;color:#b42318}'
        . '</style></head><body><main><h1>' . h($title) . '</h1>' . $body . '</main></body></html>';
    exit;
}

$input = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' ? $_POST : $_GET;
$id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$token = is_string($input['token'] ?? null) ? $input['token'] : '';

$review = null;
if ($id !== false && preg_match('/^[0-9a-f]{64}$/', $token)) {
    $find = db()->prepare('SELECT id, full_name, course, rating, comment, status, moderation_token FROM reviews WHERE id = ?');
    $find->execute([$id]);
    $row = $find->fetch();
    if ($row && hash_equals($row['moderation_token'], $token)) {
        $review = $row;
    }
}
if (!$review) {
    page(404, 'Link not valid', '<p class="muted">This review link is wrong or the review no longer exists.</p>');
}

$labels = ['pending' => 'Waiting for approval', 'approved' => 'Published on the website', 'rejected' => 'Rejected (hidden)'];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $action = is_string($input['action'] ?? null) ? $input['action'] : '';
    $status = ['approve' => 'approved', 'reject' => 'rejected'][$action] ?? null;
    if ($status === null) {
        page(400, 'Unknown action', '<p class="muted">Please use the Approve or Reject button.</p>');
    }
    db()->prepare('UPDATE reviews SET status = ? WHERE id = ?')->execute([$status, $review['id']]);
    $review['status'] = $status;
}

$rating = (int) $review['rating'];
$course = $review['course'] === 'driving' ? 'Driving school' : 'Computer college';
$hidden = '<input type="hidden" name="id" value="' . (int) $review['id'] . '"><input type="hidden" name="token" value="' . h($token) . '">';

page(200, 'Student review', implode('', [
    '<div class="stars" aria-label="' . $rating . ' stars">' . str_repeat('★', $rating) . str_repeat('☆', 5 - $rating) . '</div>',
    '<blockquote>“' . h($review['comment']) . '”</blockquote>',
    '<p><strong>' . h($review['full_name']) . '</strong> <span class="muted">· ' . $course . '</span></p>',
    '<p class="muted">Status: <strong>' . $labels[$review['status']] . '</strong></p>',
    '<form method="post" class="actions">' . $hidden,
    $review['status'] !== 'approved' ? '<button class="ok" name="action" value="approve">Approve &amp; publish</button>' : '',
    $review['status'] !== 'rejected' ? '<button class="no" name="action" value="reject">' . ($review['status'] === 'approved' ? 'Remove from website' : 'Reject') . '</button>' : '',
    '</form>',
]));
