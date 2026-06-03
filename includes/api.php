<?php
declare(strict_types=1);

/**
 * includes/api.php — Hàm phụ trợ Client Portal PHP
 * Kết nối sang Server Node.js (verify-key, AI tune)
 */

/**
 * Đọc file .env và nạp biến môi trường (PHP không tự đọc .env).
 */
function load_env_file(?string $path = null): void
{
    $path = $path ?? dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\"'");
        if ($key !== '' && getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
}

load_env_file();

/**
 * URL gốc Server Node.js — đọc KEY_API_URL từ .env, mặc định 127.0.0.1:3000.
 */
function node_api_base_url(): string
{
    $url = getenv('KEY_API_URL') ?: 'http://127.0.0.1:3000';
    $normalized = preg_replace('#^(https?)://localhost(?=[:/]|$)#', '$1://127.0.0.1', $url);
    if (is_string($normalized)) {
        $url = $normalized;
    }
    return rtrim($url, '/');
}

/**
 * Trích xuất IP người dùng cuối an toàn qua Proxy / Cloudflare / Local.
 */
function get_user_client_ip(): string
{
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $user_ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $user_ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    } else {
        $user_ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    $user_ip = trim($user_ip);

    if ($user_ip === '::1') {
        $user_ip = '127.0.0.1';
    }

    if (str_starts_with($user_ip, '::ffff:')) {
        $user_ip = substr($user_ip, 7);
    }

    if (preg_match('/^(\d+\.\d+\.\d+\.\d+):\d+$/', $user_ip, $m)) {
        $user_ip = $m[1];
    }

    return $user_ip ?: 'unknown';
}

/**
 * Gọi POST /api/integration/verify-key — xác thực Key + khóa IP trên Node.js.
 *
 * @return array{ok:bool,http_code:int,data:array,raw:string,error?:string}
 */
function node_verify_key(string $key, string $client_ip): array
{
    $endpoint = node_api_base_url() . '/api/integration/verify-key';
    $payload = json_encode([
        'key' => trim($key),
        'client_ip' => $client_ip,
    ], JSON_UNESCAPED_UNICODE);

    if ($payload === false) {
        return [
            'ok' => false,
            'http_code' => 0,
            'data' => ['success' => false, 'message' => 'Lỗi mã hóa JSON'],
            'raw' => '',
            'error' => 'json_encode failed',
        ];
    }

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        // Chống treo trang khi Node.js chưa bật — timeout tối đa 5 giây
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $raw = curl_exec($ch);
    $curlErrNo = curl_errno($ch);
    $curlErr = curl_error($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($curlErrNo !== 0 || $raw === false) {
        return [
            'ok' => false,
            'http_code' => $httpCode,
            'data' => [
                'success' => false,
                'message' => 'Không thể kết nối đến Server Node.js (Hãy đảm bảo port 3000 đang chạy!).',
            ],
            'raw' => '',
            'error' => $curlErr ?: ('curl_errno ' . $curlErrNo),
        ];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [
            'ok' => false,
            'http_code' => $httpCode,
            'data' => [
                'success' => false,
                'message' => 'API Node trả về không phải JSON hợp lệ',
            ],
            'raw' => $raw,
            'error' => 'invalid json',
        ];
    }

    $success = !empty($data['success']) && $httpCode >= 200 && $httpCode < 300;

    return [
        'ok' => $success,
        'http_code' => $httpCode,
        'data' => $data,
        'raw' => $raw,
    ];
}

/**
 * Heartbeat — POST /api/integration/verify-key (mode heartbeat).
 * Phát hiện Kick / Ban mà không cho phép tự đăng nhập lại.
 */
function node_check_session(string $key, string $client_ip, int $session_version): array
{
    $endpoint = node_api_base_url() . '/api/integration/verify-key';
    $payload = json_encode([
        'key' => trim($key),
        'client_ip' => $client_ip,
        'heartbeat' => true,
        'session_version' => $session_version,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 5,
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        return ['success' => false, 'kicked' => true, 'message' => 'Lỗi kiểm tra phiên'];
    }
    if (empty($data['success'])) {
        $data['kicked'] = true;
        $data['message'] = $data['message']
            ?? 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!';
    } else {
        $data['kicked'] = false;
    }
    return $data;
}

/** Sinh mã HWID hiển thị ổn định theo key + IP */
function portal_hwid_display(string $key, string $ip): string
{
    $hash = strtoupper(substr(hash('sha256', $key . '|' . $ip), 0, 8));
    return 'HWID-KH-99XFF-' . $hash;
}

/** Chuỗi HWID Bypass SHA-256 (16 ký tự hex) */
function portal_hwid_bypass_hash(string $key, string $ip): string
{
    return substr(hash('sha256', 'bypass|' . $key . '|' . $ip), 0, 16);
}

/**
 * GET /api/integration/system-files — danh sách file tinh chỉnh từ Admin.
 *
 * @return array{success:bool,files:array<int,array>,message?:string}
 */
function node_list_system_files(): array
{
    return node_fetch_file_list('/api/integration/system-files');
}

function node_list_cheathack_files(): array
{
    return node_fetch_file_list('/api/integration/cheathack-files');
}

/**
 * @return array{success:bool,files:array<int,array>,message?:string}
 */
function node_fetch_file_list(string $path): array
{
    $endpoint = node_api_base_url() . $path;
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_HTTPGET => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        return ['success' => false, 'files' => []];
    }
    return [
        'success' => !empty($data['success']),
        'files' => is_array($data['files'] ?? null) ? $data['files'] : [],
        'message' => $data['message'] ?? '',
    ];
}

/**
 * POST /api/integration/ai-tune — tinh chỉnh độ nhạy (FREE giới hạn 1 lần).
 *
 * @return array{success:bool,data:array,http_code:int}
 */
function node_ai_tune_sensitivity(string $key, string $client_ip, array $payload): array
{
    $endpoint = node_api_base_url() . '/api/integration/ai-tune';
    $body = array_merge($payload, [
        'key' => trim($key),
        'client_ip' => $client_ip,
    ]);
    $json = json_encode($body, JSON_UNESCAPED_UNICODE);
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $json,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);
    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        return ['success' => false, 'http_code' => $httpCode, 'data' => []];
    }
    return ['success' => !empty($data['success']), 'http_code' => $httpCode, 'data' => $data];
}

/** Che IP hiển thị dạng mã hóa bảo mật */
function mask_ip_display(string $ip): string
{
    if ($ip === '' || $ip === 'unknown') {
        return '•••.•••.•••.•••';
    }
    $parts = explode('.', $ip);
    if (count($parts) === 4) {
        return $parts[0] . '.***.***.' . $parts[3];
    }
    return substr($ip, 0, 4) . '••••••';
}

/** Escape HTML an toàn */
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/** Định dạng thời gian Việt Nam */
function format_vn_datetime(?string $iso): string
{
    if (!$iso) {
        return '—';
    }
    $ts = strtotime($iso);
    if ($ts === false) {
        return '—';
    }
    return date('d/m/Y H:i:s', $ts);
}
