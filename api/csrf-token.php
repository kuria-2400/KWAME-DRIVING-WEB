<?php
// GET /api/csrf-token.php -> { success, token }
// The pages are static HTML, so the booking form fetches its CSRF token from here on load.
declare(strict_types=1);

require dirname(__DIR__) . '/includes/bootstrap.php';

require_method('GET');

json_response(200, ['success' => true, 'token' => csrf_token()]);
