<?php
// POST /api/booking.php: booking requests from the wizard on contact.html.
// Validates every field, stores the request, emails the school, and answers in JSON:
//   201 { success: true,  message, reference }
//   422 { success: false, message, errors: { field: "problem" } }
//   403 bad CSRF token / origin · 405 wrong method · 429 too many requests · 500 server error
declare(strict_types=1);

require dirname(__DIR__) . '/includes/bootstrap.php';

require_method('POST');
$input = request_input();
verify_csrf($input);

// Honeypot: real visitors never see the "website" field. Bots that fill it get a
// normal-looking success so they don't retry, and nothing is stored.
if (clean_line($input['website'] ?? '', 200) !== '') {
    json_response(201, ['success' => true, 'message' => "Request sent! We'll be in touch soon."]);
}

/* ---------- Validate ---------- */

const PACKAGES = ['driving' => 'Driving school', 'comp-package' => 'Computer college'];
const TIMES    = ['Morning', 'Afternoon'];
const GENDERS  = ['Male', 'Female'];

$errors = [];

$package = clean_line($input['package'] ?? '', 20);
if (!array_key_exists($package, PACKAGES)) {
    $errors['package'] = 'Please choose driving or computer.';
}

$dateRaw = clean_line($input['preferred_date'] ?? '', 10);
$today = new DateTimeImmutable('today');
$date = DateTimeImmutable::createFromFormat('!Y-m-d', $dateRaw);
if (!$date || $date->format('Y-m-d') !== $dateRaw) {
    $errors['preferred_date'] = 'Please pick a valid start date.';
} elseif ($date < $today) {
    $errors['preferred_date'] = "The start date can't be in the past.";
} elseif ($date > $today->modify('+1 year')) {
    $errors['preferred_date'] = 'Please pick a start date within the next year.';
}

$time = clean_line($input['preferred_time'] ?? '', 20);
if (!in_array($time, TIMES, true)) {
    $errors['preferred_time'] = 'Please choose morning or afternoon.';
}

$name = clean_line($input['name'] ?? '', 100);
if (mb_strlen($name) < 2) {
    $errors['name'] = 'Please enter your full name.';
} elseif (!preg_match('/^[\p{L}\p{M}][\p{L}\p{M} .\'-]*$/u', $name)) {
    $errors['name'] = 'Your name can only contain letters, spaces, hyphens and apostrophes.';
}

// Accept 0712 345 678, +254 712-345-678, (0712) 345678 ... and store digits only (with leading +).
$phoneRaw = clean_line($input['phone'] ?? '', 30);
$phone = preg_replace('/[\s().-]+/', '', $phoneRaw) ?? '';
if (!preg_match('/^\+?\d{9,15}$/', $phone)) {
    $errors['phone'] = 'Please enter a valid phone number.';
}

$email = clean_line($input['email'] ?? '', 254);
if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email'] = 'Please enter a valid email address.';
}

$gender = clean_line($input['gender'] ?? '', 10);
if (!in_array($gender, GENDERS, true)) {
    $errors['gender'] = 'Please select your gender.';
}

// Kenyan national ID (digits) or passport number (letters + digits).
$idNumber = strtoupper(clean_line($input['id_number'] ?? '', 20));
if (!preg_match('/^[A-Z0-9]{5,20}$/', $idNumber)) {
    $errors['id_number'] = 'Please enter a valid ID or passport number.';
}

$message = clean_text($input['message'] ?? '', 2000);

if ($errors) {
    json_response(422, [
        'success' => false,
        'message' => implode(' ', $errors),
        'errors'  => $errors,
    ]);
}

/* ---------- Rate limit (per IP, rolling hour) ---------- */

$ip = client_ip();
$pdo = db();

$recent = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE ip_address = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 HOUR)');
$recent->execute([$ip]);
if ((int) $recent->fetchColumn() >= app_config()['rate_limit']) {
    header('Retry-After: 3600');
    json_response(429, [
        'success' => false,
        'message' => "We've received several requests from you already. Please call or text us instead.",
    ]);
}

/* ---------- Store ---------- */

$reference = 'KW-' . strtoupper(bin2hex(random_bytes(4)));
$userAgent = mb_substr(clean_line($_SERVER['HTTP_USER_AGENT'] ?? '', 255), 0, 255);

$insert = $pdo->prepare(
    'INSERT INTO bookings
        (reference, package, preferred_date, preferred_time, full_name, phone, email, gender, id_number, message, ip_address, user_agent)
     VALUES
        (:reference, :package, :preferred_date, :preferred_time, :full_name, :phone, :email, :gender, :id_number, :message, :ip_address, :user_agent)'
);
$insert->execute([
    ':reference'      => $reference,
    ':package'        => $package,
    ':preferred_date' => $date->format('Y-m-d'),
    ':preferred_time' => $time,
    ':full_name'      => $name,
    ':phone'          => $phone,
    ':email'          => $email,
    ':gender'         => $gender,
    ':id_number'      => $idNumber,
    ':message'        => $message !== '' ? $message : null,
    ':ip_address'     => $ip,
    ':user_agent'     => $userAgent !== '' ? $userAgent : null,
]);

/* ---------- Notify the school (best effort: the booking is already saved) ---------- */

$config = app_config();
if ($config['mail_to']) {
    $body = implode("\n", [
        'New booking request from the website',
        '',
        "Reference:  $reference",
        'Course:     ' . PACKAGES[$package],
        'Start date: ' . $date->format('D j M Y') . " ($time)",
        "Name:       $name",
        "Phone:      $phone",
        "Email:      $email",
        "Gender:     $gender",
        "ID number:  $idNumber",
        '',
        'Message:',
        $message !== '' ? $message : '(none)',
    ]);
    $headers = ['Content-Type: text/plain; charset=UTF-8'];
    if ($config['mail_from']) {
        $headers[] = 'From: Kwame Website <' . $config['mail_from'] . '>';
    }
    // $email passed FILTER_VALIDATE_EMAIL, so it cannot carry header line breaks.
    $headers[] = "Reply-To: $email";
    if (!@mail($config['mail_to'], "New booking request $reference", $body, implode("\r\n", $headers))) {
        error_log("[kwame-api] booking $reference saved but notification email failed");
    }
}

json_response(201, [
    'success'   => true,
    'message'   => "Request sent! We'll call or text you within one business day to confirm.",
    'reference' => $reference,
]);
