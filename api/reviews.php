<?php
// /api/reviews.php: student reviews for the carousel on index.html.
//   GET  -> 200 { success: true, reviews: [{ name, course, rating, comment, date }], count, average }
//           The 30 newest approved reviews; count and average cover every approved review.
//   POST -> 201 { success: true, message } after storing a new review as 'pending'
//           422 { success: false, message, errors: { field: "problem" } }
//           403 bad CSRF token / origin · 429 too many reviews · 500 server error
// New reviews stay hidden until the school approves them via api/review-moderate.php.
declare(strict_types=1);

require dirname(__DIR__) . '/includes/bootstrap.php';

require_method('GET', 'POST');

const REVIEW_COURSES = ['driving' => 'Driving school', 'comp-package' => 'Computer college'];
const REVIEWS_SHOWN  = 30;
const REVIEWS_PER_IP_PER_DAY = 3;

$pdo = db();

/* ---------- GET: published reviews ---------- */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $rows = $pdo->query(
        "SELECT full_name, course, rating, comment, created_at
           FROM reviews
          WHERE status = 'approved'
          ORDER BY created_at DESC, id DESC
          LIMIT " . REVIEWS_SHOWN
    )->fetchAll();

    $stats = $pdo->query("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE status = 'approved'")->fetch();

    // Reviews change rarely; let browsers reuse the list for a few minutes.
    header('Cache-Control: public, max-age=300');
    json_response(200, [
        'success' => true,
        'reviews' => array_map(static fn (array $r): array => [
            'name'    => $r['full_name'],
            'course'  => $r['course'],
            'rating'  => (int) $r['rating'],
            'comment' => $r['comment'],
            // Stored in UTC; show the school's local date
            'date'    => (new DateTimeImmutable((string) $r['created_at'], new DateTimeZone('UTC')))
                ->setTimezone(new DateTimeZone(date_default_timezone_get()))->format('Y-m-d'),
        ], $rows),
        'count'   => (int) $stats['n'],
        'average' => $stats['n'] ? round((float) $stats['avg'], 1) : null,
    ]);
}

/* ---------- POST: new review ---------- */

$input = request_input(5000);
verify_csrf($input);

// Honeypot, same as the booking form: bots get a normal-looking success and nothing is stored.
if (clean_line($input['website'] ?? '', 200) !== '') {
    json_response(201, ['success' => true, 'message' => 'Thank you! Your review will appear once the school approves it.']);
}

$errors = [];

$name = clean_line($input['name'] ?? '', 60);
if (mb_strlen($name) < 2) {
    $errors['name'] = 'Please enter your name.';
} elseif (!preg_match('/^[\p{L}\p{M}][\p{L}\p{M} .\'-]*$/u', $name)) {
    $errors['name'] = 'Your name can only contain letters, spaces, hyphens and apostrophes.';
}

$course = clean_line($input['course'] ?? '', 20);
if (!array_key_exists($course, REVIEW_COURSES)) {
    $errors['course'] = 'Please choose driving or computer.';
}

$rating = filter_var($input['rating'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
if ($rating === false) {
    $errors['rating'] = 'Please choose a star rating.';
}

$comment = clean_line($input['comment'] ?? '', 500);
if (mb_strlen($comment) < 10) {
    $errors['comment'] = 'Please write a few words about your experience (at least 10 characters).';
} elseif (preg_match('~https?://|www\.~i', $comment)) {
    $errors['comment'] = 'Please leave links out of your review.';
}

if ($errors) {
    json_response(422, [
        'success' => false,
        'message' => implode(' ', $errors),
        'errors'  => $errors,
    ]);
}

/* ---------- Rate limit (per IP, rolling day) ---------- */

$ip = client_ip();
$recent = $pdo->prepare('SELECT COUNT(*) FROM reviews WHERE ip_address = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 DAY)');
$recent->execute([$ip]);
if ((int) $recent->fetchColumn() >= REVIEWS_PER_IP_PER_DAY) {
    header('Retry-After: 86400');
    json_response(429, [
        'success' => false,
        'message' => "We've already received several reviews from you today. Thank you!",
    ]);
}

/* ---------- Store ---------- */

$token = bin2hex(random_bytes(32));
$userAgent = mb_substr(clean_line($_SERVER['HTTP_USER_AGENT'] ?? '', 255), 0, 255);

$insert = $pdo->prepare(
    'INSERT INTO reviews (full_name, course, rating, comment, moderation_token, ip_address, user_agent)
     VALUES (:full_name, :course, :rating, :comment, :token, :ip_address, :user_agent)'
);
$insert->execute([
    ':full_name'  => $name,
    ':course'     => $course,
    ':rating'     => $rating,
    ':comment'    => $comment,
    ':token'      => $token,
    ':ip_address' => $ip,
    ':user_agent' => $userAgent !== '' ? $userAgent : null,
]);
$id = (int) $pdo->lastInsertId();

/* ---------- Ask the school to approve it (best effort: the review is already saved) ---------- */

if (app_config()['mail_to']) {
    $link = api_url("review-moderate.php?id=$id&token=$token");

    $body = implode("\n", [
        'A student left a review on the website. It stays hidden until you approve it.',
        '',
        "Name:    $name",
        'Course:  ' . REVIEW_COURSES[$course],
        'Rating:  ' . str_repeat('★', $rating) . str_repeat('☆', 5 - $rating) . " ($rating/5)",
        '',
        $comment,
        '',
        'Approve or reject it here:',
        $link,
    ]);
    if (!send_school_mail("New review from $name ($rating/5)", $body)) {
        error_log("[kwame-api] review $id saved but notification email failed");
    }
}

json_response(201, [
    'success' => true,
    'message' => 'Thank you! Your review will appear once the school approves it.',
]);
