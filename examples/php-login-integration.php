<?php
/**
 * Mẫu tích hợp activate.php → API Node verify-key
 * Trang PHP: http://127.0.0.1:8080/activate.php
 *
 * Đặt biến môi trường KEY_API_URL = URL Node (vd: http://127.0.0.1:3000)
 */
session_start();

$NODE_API = getenv('KEY_API_URL') ?: 'http://127.0.0.1:3000';
$NODE_API = preg_replace('#^(https?)://localhost(?=[:/]|$)#', '$1://127.0.0.1', $NODE_API) ?: $NODE_API;

function getClientIp(): string {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    if (str_starts_with($ip, '::ffff:')) {
        $ip = substr($ip, 7);
    }
    return $ip;
}

/** Gọi POST /api/integration/verify-key — khóa IP & kích hoạt hạn từ Node */
function verifyKeyWithNode(string $key, string $clientIp): array {
    global $NODE_API;
    $payload = json_encode([
        'key' => $key,
        'client_ip' => $clientIp,
    ]);

    $ch = curl_init($NODE_API . '/api/integration/verify-key');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true) ?: [
        'success' => false,
        'status' => 'server_error',
        'message' => 'Không kết nối được API Node',
    ];
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $key = trim($_POST['key'] ?? '');
    $result = verifyKeyWithNode($key, getClientIp());

    if (!empty($result['success'])) {
        $_SESSION['vip_key'] = $key;
        $_SESSION['key_type'] = $result['keyType'] ?? 'VIP';
        $_SESSION['expired_at'] = $result['expiredAt'] ?? null;
        header('Location: dashboard.php');
        exit;
    }

    $error = $result['message'] ?? 'Đăng nhập thất bại';
    $errorStatus = $result['status'] ?? '';
}
