<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/api.php';

set_time_limit(15);
ini_set('default_socket_timeout', '5');
session_start();

header('X-Content-Type-Options: nosniff');

function portal_json_response(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function portal_set_session_from_node(array $data, string $keyInput, string $clientIp): void
{
    $_SESSION['cloud_key'] = (string) ($data['key'] ?? $keyInput);
    $_SESSION['cloud_key_type'] = strtoupper((string) ($data['keyType'] ?? 'VIP'));
    $_SESSION['cloud_expired_at'] = (string) ($data['expiredAt'] ?? '');
    $_SESSION['cloud_days_left'] = (int) ($data['daysLeft'] ?? 0);
    $_SESSION['cloud_bound_ip'] = (string) ($data['boundIP'] ?? $clientIp);
    $_SESSION['cloud_session_version'] = (int) ($data['sessionVersion'] ?? 0);
    $_SESSION['cloud_message'] = (string) ($data['message'] ?? 'Key hợp lệ!');
    $_SESSION['cloud_sensitivity_count'] = (int) ($data['sensitivityAdjustCount'] ?? 0);
}

// ── API JSON ──
if (isset($_GET['action'])) {
    $action = $_GET['action'];

    if ($action === 'verify' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = json_decode(file_get_contents('php://input') ?: '{}', true);
        $keyInput = trim((string) ($body['key'] ?? ''));
        if ($keyInput === '') {
            portal_json_response(['success' => false, 'message' => 'Thiếu key'], 400);
        }
        $clientIp = get_user_client_ip();
        try {
            $result = node_verify_key($keyInput, $clientIp);
        } catch (Throwable $e) {
            portal_json_response([
                'success' => false,
                'message' => 'Không thể kết nối đến Server Node.js (Hãy đảm bảo port 3000 đang chạy!).',
            ]);
        }
        $data = $result['data'];
        if ($result['ok'] && !empty($data['success'])) {
            portal_set_session_from_node($data, $keyInput, $clientIp);
            portal_json_response([
                'success' => true,
                'message' => $data['message'] ?? 'OK',
                'keyType' => $data['keyType'] ?? 'VIP',
                'status' => 'success',
                'sensitivityAdjustCount' => (int) ($data['sensitivityAdjustCount'] ?? 0),
            ]);
        }
        portal_json_response([
            'success' => false,
            'message' => $data['message'] ?? 'Đăng nhập thất bại',
            'keyType' => $data['keyType'] ?? 'VIP',
            'status' => $data['status'] ?? 'unknown_error',
            'sensitivityAdjustCount' => (int) ($data['sensitivityAdjustCount'] ?? 0),
        ]);
    }

    if ($action === 'check_session') {
        if (empty($_SESSION['cloud_key'])) {
            portal_json_response(['success' => false, 'kicked' => true, 'message' => 'Chưa đăng nhập']);
        }
        $check = node_check_session(
            (string) $_SESSION['cloud_key'],
            get_user_client_ip(),
            (int) ($_SESSION['cloud_session_version'] ?? 0)
        );
        if (empty($check['success'])) {
            $_SESSION = [];
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_destroy();
            }
            portal_json_response([
                'success' => false,
                'kicked' => true,
                'message' => $check['message']
                    ?? 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
                'keyType' => $_SESSION['cloud_key_type'] ?? 'VIP',
                'status' => $check['status'] ?? 'session_error',
            ]);
        }
        if (isset($check['sessionVersion'])) {
            $_SESSION['cloud_session_version'] = (int) $check['sessionVersion'];
        }
        if (isset($check['sensitivityAdjustCount'])) {
            $_SESSION['cloud_sensitivity_count'] = (int) $check['sensitivityAdjustCount'];
        }
        portal_json_response(['success' => true, 'kicked' => false]);
    }

    if ($action === 'system_files') {
        try {
            $result = node_list_system_files();
            portal_json_response([
                'success' => $result['success'],
                'files' => $result['files'],
            ]);
        } catch (Throwable $e) {
            portal_json_response(['success' => false, 'files' => []]);
        }
    }

    if ($action === 'cheathack_files') {
        try {
            $result = node_list_cheathack_files();
            portal_json_response([
                'success' => $result['success'],
                'files' => $result['files'],
            ]);
        } catch (Throwable $e) {
            portal_json_response(['success' => false, 'files' => []]);
        }
    }

    if ($action === 'ai_tune' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (empty($_SESSION['cloud_key'])) {
            portal_json_response(['success' => false, 'message' => 'Chưa đăng nhập'], 401);
        }
        $body = json_decode(file_get_contents('php://input') ?: '{}', true);
        if (!is_array($body)) {
            $body = [];
        }
        try {
            $result = node_ai_tune_sensitivity(
                (string) $_SESSION['cloud_key'],
                get_user_client_ip(),
                $body
            );
            $data = $result['data'];
            if (!empty($data['success'])) {
                $_SESSION['cloud_sensitivity_count'] = (int) ($data['sensitivityAdjustCount'] ?? 0);
            }
            portal_json_response($data, $result['http_code'] >= 400 ? $result['http_code'] : 200);
        } catch (Throwable $e) {
            portal_json_response(['success' => false, 'message' => 'Không kết nối được server AI'], 503);
        }
    }
}

// ── Logout ──
if (isset($_GET['logout']) || (isset($_POST['action']) && $_POST['action'] === 'logout')) {
    $_SESSION = [];
    session_destroy();
    header('Location: activate.php');
    exit;
}

$is_logged_in = !empty($_SESSION['cloud_key']);
$session_key = (string) ($_SESSION['cloud_key'] ?? '');
$session_key_type = strtoupper((string) ($_SESSION['cloud_key_type'] ?? 'VIP'));
$session_expired_at = (string) ($_SESSION['cloud_expired_at'] ?? '');
$session_days_left = (int) ($_SESSION['cloud_days_left'] ?? 0);
$session_bound_ip = (string) ($_SESSION['cloud_bound_ip'] ?? '');
$masked_ip = mask_ip_display($session_bound_ip);
$client_ip_live = get_user_client_ip();
$portal_hwid = $is_logged_in
    ? portal_hwid_display($session_key, $client_ip_live)
    : '';
$portal_hwid_bypass = $is_logged_in
    ? portal_hwid_bypass_hash($session_key, $client_ip_live)
    : '';
$node_api_url = node_api_base_url();

$zalo_phone = getenv('ZALO_PHONE') ?: '0775893691';
$vip_purchase_url = getenv('VIP_PURCHASE_URL') ?: 'https://zalo.me/0775893691';

$portal_config = [
    'loggedIn' => $is_logged_in,
    'sessionKey' => $session_key,
    'keyType' => $session_key_type,
    'expiredAt' => $session_expired_at,
    'nodeApi' => $node_api_url,
    'sensitivityAdjustCount' => (int) ($_SESSION['cloud_sensitivity_count'] ?? 0),
    'vipPurchaseUrl' => $vip_purchase_url,
    'zaloPhone' => $zalo_phone,
];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khang Huynh Cloud System</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body class="cyber-body min-h-screen">
<div class="cyber-grid-bg fixed inset-0 z-[-1] pointer-events-none"></div>

<!-- Ping Status -->
<div class="ping-status-bar">
  <div class="ping-dot"></div>
  <span>Mạng: Ổn định (12ms) | Trạng thái Server AI: Hoạt động 99.9%</span>
</div>

<!-- Global Toast Container -->
<div id="globalToastContainer" class="global-toast-container"></div>

<!-- Theme toggle góc phải -->
<div class="fixed top-4 right-4 z-[60] flex items-center gap-3">
  <span class="text-xs text-slate-500 hidden sm:inline">Dark/Light</span>
  <div id="themeToggle" class="theme-toggle" title="Chuyển giao diện"></div>
</div>

<?php if (!$is_logged_in): ?>
<!-- ═══ MÀN HÌNH KHÓA BẢO MẬT ═══ -->
<div class="min-h-screen flex flex-col login-hero-wrap">
  <canvas id="particleCanvas" aria-hidden="true"></canvas>
  <header class="border-b border-indigo-500/20 glass-panel sticky top-0 z-40 login-form-layer">
    <div class="max-w-4xl mx-auto px-4 py-5 text-center">
      <h1 class="text-lg sm:text-2xl font-black tracking-[0.2em] neon-title-pulse portal-heading">
        KHANG HUYNH CLOUD SYSTEM
      </h1>
      <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div class="glass-panel rounded-lg px-2 py-2"><span class="portal-label text-slate-500">Băng thông</span><br><strong class="text-cyan-400" id="statBw">10 Gbps</strong></div>
        <div class="glass-panel rounded-lg px-2 py-2"><span class="portal-label text-slate-500">Uptime</span><br><strong class="text-emerald-400">99.9%</strong></div>
        <div class="glass-panel rounded-lg px-2 py-2"><span class="portal-label text-slate-500">Build</span><br><strong class="text-violet-400">v3.8</strong></div>
        <div class="glass-panel rounded-lg px-2 py-2"><span class="portal-label text-slate-500">VIP</span><br><strong class="text-amber-400">124.5K+</strong></div>
      </div>
      <div class="live-notify-bar mt-3 login-form-layer">
        <div class="live-notify-track">
          <span class="live-notify-text">⚡ [Hệ thống Cloud] Hơn 1,420 người dùng VIP đang kích hoạt độ nhạy thành công trong hôm nay.</span>
          <span class="live-notify-text" aria-hidden="true">⚡ [Hệ thống Cloud] Hơn 1,420 người dùng VIP đang kích hoạt độ nhạy thành công trong hôm nay.</span>
        </div>
      </div>
    </div>
  </header>

  <main class="flex-1 flex items-center justify-center p-4 login-form-layer">
    <div class="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl">
      <div class="text-center mb-6">
        <div class="inline-flex w-16 h-16 rounded-full border border-cyan-500/40 items-center justify-center mb-4">
          <i class="fa-solid fa-shield-halved text-2xl text-cyan-400"></i>
        </div>
        <h2 class="text-sm font-bold tracking-wide portal-heading">CẤP PHÉP ỦY QUYỀN CHÍNH THỨC — ADMIN KHANG HUYNH</h2>
        <p class="mt-3 text-xs portal-label text-slate-400 leading-relaxed">
          Vui lòng nhập Khóa mã hóa truy cập (Key) để tiếp tục quy trình định danh thiết bị.
        </p>
      </div>

      <form id="loginForm" class="space-y-4">
        <div class="relative">
          <label class="text-xs portal-label text-slate-500 uppercase tracking-wider">Mã Key truy cập</label>
          <div class="key-conic-wrap">
            <div class="animated-neon-border rounded-xl">
        <div class="flex relative z-10 bg-zinc-950/50 rounded-xl overflow-hidden backdrop-blur-md">
          <input type="text" id="keyInput" name="keyString" placeholder="Nhập Key kích hoạt..." required
            class="flex-1 bg-transparent px-4 py-3 text-cyan-300 font-mono focus:outline-none placeholder-zinc-600 border-none ring-0">
          <button type="submit"
            class="px-6 py-3 bg-cyan-600/20 text-cyan-400 font-bold border-l border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">
            KÍCH HOẠT
          </button>
        </div>
      </div>
          </div>
        </div>
        <p id="loginError" class="text-sm text-red-400 hidden"></p>
        <button type="submit" class="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-bold text-white hover:opacity-90 transition shadow-lg shadow-cyan-500/20">
          Tiếp Tục Quy Trình
        </button>
      </form>

      <p class="mt-6 text-center">
        <a href="https://zalo.me/0775893691" target="_blank" rel="noopener" class="zalo-link text-sm font-semibold">
          <i class="fa-brands fa-telegram mr-1"></i> Liên Hệ Admin Mua Key
        </a>
      </p>
    </div>
  </main>
</div>

<!-- Modal xác thực -->
<div id="authModal" class="modal-overlay fixed inset-0 z-[70] hidden flex items-center justify-center">
  <div class="glass-panel rounded-2xl p-10 text-center max-w-sm mx-4">
    <div id="authSpinner" class="cyber-spinner mx-auto mb-6"></div>
    <div id="authSuccess" class="hidden text-5xl text-emerald-400 mb-4"><i class="fa-solid fa-circle-check"></i></div>
    <p id="authStatus" class="text-sm text-cyan-200">Đang xác thực...</p>
  </div>
</div>

<?php else: ?>
<!-- ═══ DASHBOARD SAU ĐĂNG NHẬP ═══ -->
<div id="drawerBackdrop" class="drawer-backdrop fixed inset-0 z-40"></div>
<aside id="drawer" class="drawer-panel fixed top-0 left-0 h-full w-64 glass-panel z-50 pt-16 px-4">
  <nav class="space-y-2">
    <button data-page="account" class="w-full text-left px-4 py-3 rounded-lg hover:bg-cyan-500/10 text-cyan-400 flex items-center gap-2">
      <i class="fa-solid fa-id-card"></i> Tài Khoản
    </button>
    <button data-page="ai" class="w-full text-left px-4 py-3 rounded-lg hover:bg-violet-500/10 text-slate-300 flex items-center gap-2">
      <i class="fa-solid fa-microchip"></i> Phân Tích AI
    </button>
    <button data-page="files" class="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-500/10 text-slate-300 flex items-center gap-2">
      <i class="fa-solid fa-file-code"></i> File Tinh Chỉnh Hệ Thống
    </button>
    <button data-page="cheathack" class="w-full text-left px-4 py-3 rounded-lg hover:bg-fuchsia-500/10 text-slate-300 flex items-center gap-2">
      <i class="fa-solid fa-gamepad"></i> CheatHack - Pmt3
    </button>
  </nav>
  <form method="POST" action="activate.php" class="mt-8">
    <input type="hidden" name="action" value="logout">
    <button type="submit" class="text-xs text-slate-500 hover:text-red-400"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</button>
  </form>
</aside>

<header class="glass-panel border-b border-cyan-500/20 sticky top-0 z-30 px-4 py-3 flex items-center gap-4">
  <button id="menuBtn" class="text-cyan-400 text-xl p-2"><i class="fa-solid fa-bars"></i></button>
  <span class="font-bold text-cyan-300 tracking-wider text-sm">KHANG HUYNH CLOUD</span>
</header>

<main class="max-w-4xl mx-auto p-4 pb-16">

  <!-- MỤC 1: TÀI KHOẢN -->
  <section id="page-account" class="page-section active">
    <div class="grid md:grid-cols-3 gap-4">
      <!-- Countdown compact -->
      <div class="md:col-span-1 glass-panel rounded-xl p-4 border border-violet-500/30">
        <p class="text-xs text-slate-500 uppercase tracking-wider">Tời gian còn lại</p>
        <p id="countdown" class="text-lg font-mono font-bold text-violet-300 mt-2">--:--:--</p>
        <p class="text-xs text-slate-600 mt-1">~<?= (int) $session_days_left ?> ngày</p>
      </div>

      <!-- Digital ID Card -->
      <div class="md:col-span-2 digital-id rounded-2xl p-6">
        <div class="flex flex-wrap justify-between items-start gap-4 relative z-10">
          <div>
            <p class="text-xs text-slate-500 uppercase tracking-widest">AGENT ID: #KH-MASTER</p>
            <p class="font-mono text-cyan-300 mt-1 text-sm break-all"><?= e($session_key) ?></p>
          </div>
          <?php if ($session_key_type === 'VIP'): ?>
          <span class="badge-vip badge-vip-gold">VIP PREMIUM</span>
          <?php else: ?>
          <span class="badge-free badge-free-silver">MEMBER FREE</span>
          <?php endif; ?>
        </div>
        <div class="mt-6 grid sm:grid-cols-2 gap-4 text-sm relative z-10">
          <div>
            <span class="portal-label text-slate-500 text-xs">Trạng thái Key</span>
            <p class="flex items-center gap-2 mt-1 font-semibold text-emerald-400">
              <span class="status-ping-wrap">
                <span class="status-ping-ring"></span>
                <span class="status-ping-core"></span>
              </span>
              BYPASS ANTI-CHEAT (SECURED 100%)
            </p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">IP Thiết bị (mã hóa)</span>
            <p class="font-mono text-cyan-400/80 mt-1"><?= e($masked_ip) ?></p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">RANK</span>
            <p class="font-mono text-amber-300 mt-1 text-xs font-bold">SUPREME DEVELOPER</p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">MH Phần cứng mã hóa</span>
            <p class="font-mono text-amber-300/90 mt-1 text-xs">HWID Bypass: <?= e($portal_hwid_bypass) ?></p>
          </div>
          <div class="sm:col-span-2 premium-stat-row">
            <span class="portal-label text-slate-500 text-xs">Băng thông phân tích AI độc quyền</span>
            <p class="tech-stat-line mt-1 text-violet-300">
              <i class="fa-solid fa-bolt text-amber-400"></i>
              Băng thông riêng cấp VIP: Dedicated 10 Gbps (Bypass Secure)
            </p>
          </div>
          <div class="sm:col-span-2 premium-stat-row">
            <span class="portal-label text-slate-500 text-xs">Trạng thái Bảo mật mã nguồn</span>
            <p class="tech-stat-line mt-1 text-emerald-400/95">
              <span class="status-ping-wrap shrink-0" style="width:10px;height:10px">
                <span class="status-ping-ring"></span>
                <span class="status-ping-core" style="width:6px;height:6px"></span>
              </span>
              Anti-Crack: Chống dò log / Khóa luồng ngược (Bypass Engine v5.1)
            </p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">Tốc độ phản hồi mạng</span>
            <p class="mt-1 flex items-center gap-2 text-sm">
              <span class="network-pulse-dot w-2 h-2 rounded-full bg-emerald-400"></span>
              <span id="networkLatency" class="font-mono text-emerald-400">Đang quét...</span>
            </p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">Trạng thái phân bổ dữ liệu</span>
            <p class="tech-stat-line mt-1 text-cyan-300/90">
              <i class="fa-solid fa-server text-violet-400"></i>
              Server Cluster: Node-SG03 (Hồ Chí Minh VIP Route)
            </p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">Bảo mật mã hóa</span>
            <p class="tech-stat-line mt-1 text-emerald-400/90">
              <i class="fa-solid fa-shield-check text-emerald-400"></i>
              Mã hóa cấp độ quân sự SHA-256 Verified
            </p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">Thuật toán tối ưu</span>
            <p class="tech-stat-line mt-1 text-violet-300/90">
              <i class="fa-solid fa-brain text-fuchsia-400"></i>
              AI Core: Deep Learning Meta OB53 v2.0
            </p>
          </div>
          <div class="sm:col-span-2">
            <span class="portal-label text-slate-500 text-xs">Hết hạn</span>
            <p class="mt-1 font-mono text-sm text-amber-300/90"><?= e(format_vn_datetime($session_expired_at)) ?></p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- MỤC 2: PHÂN TÍCH AI -->
  <section id="page-ai" class="page-section">
    <h2 class="ai-title-nowrap text-base sm:text-lg font-bold text-cyan-300 mb-6">
      Phân Tích AI - Fine-tune sensitivity
    </h2>

    <div class="flex gap-2 mb-4">
      <button type="button" id="tabIos" class="flex-1 py-2 border-b-2 border-cyan-400 text-cyan-300 text-sm font-semibold">iOS</button>
      <button type="button" id="tabAndroid" class="flex-1 py-2 border-b-2 border-transparent text-slate-400 text-sm font-semibold">Adr</button>
    </div>
    <div id="deviceGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8"></div>

    <p class="text-xs text-slate-500 uppercase mb-3">Tình trạng hiện tại (chọn nhiều)</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
      <div class="condition-box rounded-xl p-3 text-center text-xs" data-condition="nang_tam"><i class="fa-solid fa-weight-hanging text-lg mb-1 block"></i>Nặng tâm</div>
      <div class="condition-box rounded-xl p-3 text-center text-xs" data-condition="lo_dau"><i class="fa-solid fa-arrow-up-long text-lg mb-1 block"></i>Lố đầu</div>
      <div class="condition-box rounded-xl p-3 text-center text-xs" data-condition="rung_tam"><i class="fa-solid fa-wave-square text-lg mb-1 block"></i>Rung tâm</div>
      <div class="condition-box rounded-xl p-3 text-center text-xs" data-condition="giat_tam"><i class="fa-solid fa-bolt text-lg mb-1 block"></i>Giật tâm</div>
      <div class="condition-box rounded-xl p-3 text-center text-xs" data-condition="lac_dan"><i class="fa-solid fa-braille text-lg mb-1 block"></i>Lạc đạn</div>
      <div class="condition-box rounded-xl p-3 text-center text-xs" data-condition="kho_keo"><i class="fa-solid fa-lock text-lg mb-1 block"></i>Khó kéo</div>
    </div>

    <button type="button" id="btnAiAnalyze" class="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-4 font-bold text-white shadow-lg shadow-violet-500/20">
      <i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Bắt Đầu Phân Tích Bằng AI
    </button>

    <div id="ob53ResultCard" class="ob53-result-card relative">
      <div class="unlock-vip-overlay">
        <div class="text-5xl text-amber-400 mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
          <i class="fa-solid fa-lock"></i>
        </div>
        <button class="unlock-vip-btn" onclick="window.open('https://zalo.me/0775893691', '_blank')">
          🔓 Mở Khóa Thông Số VIP Ngay
        </button>
      </div>

      <p class="text-center text-xs text-violet-300/90 uppercase tracking-widest mb-1">OB53 · AI Optimized Profile</p>
      <h3 id="ob53DeviceLabel" class="text-center text-sm font-bold text-cyan-300 mb-5">—</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="result-grid-item"><span class="text-xs portal-label text-slate-500">Nhìn Xung Quanh</span><p class="text-2xl font-mono text-cyan-300 mt-1"><span id="rGeneral">—</span></p></div>
        <div class="result-grid-item"><span class="text-xs portal-label text-slate-500">Ống Ngắm Hồng Tâm</span><p class="text-2xl font-mono text-cyan-300 mt-1"><span id="rRedDot">—</span></p></div>
        <div class="result-grid-item"><span class="text-xs portal-label text-slate-500">Ống Ngắm 2x</span><p class="text-2xl font-mono text-cyan-300 mt-1"><span id="rScope2x">—</span></p></div>
        <div class="result-grid-item"><span class="text-xs portal-label text-slate-500">Ống Ngắm 4x</span><p class="text-2xl font-mono text-cyan-300 mt-1"><span id="rScope4x">—</span></p></div>
        <div class="result-grid-item"><span class="text-xs portal-label text-slate-500">Ống Ngắm Súng Ngắm</span><p class="text-2xl font-mono text-cyan-300 mt-1"><span id="rSniper">—</span></p></div>
        <div class="result-grid-item"><span class="text-xs portal-label text-slate-500">Nút Camera Tự Do</span><p class="text-2xl font-mono text-cyan-300 mt-1"><span id="rCamera">—</span></p></div>
        <div class="result-grid-item col-span-2"><span class="text-xs portal-label text-slate-500">Nút Bắn (Fire Button Size)</span><p class="text-2xl font-mono text-amber-300 mt-1"><span id="rFire">—</span></p></div>
      </div>
      <p class="text-center text-xs text-amber-400/80 mt-5">OB53 Optimized · Profile khóa cứng theo thiết bị</p>
    </div>
  </section>

  <!-- MỤC 3: FILE TINH CHỈNH HỆ THỐNG -->
  <section id="page-files" class="page-section">
    <h2 class="text-base sm:text-lg font-bold text-cyan-300 mb-2">
      <i class="fa-solid fa-file-code mr-2"></i>File Tinh Chỉnh Hệ Thống
    </h2>
    <p class="text-xs portal-label text-slate-500 mb-6">Danh sách 100% từ Cloud Admin — tự cập nhật mỗi 7 giây</p>

    <div id="dynamicFilesList" class="space-y-3">
      <p class="text-xs text-slate-500 text-center py-4">Đang tải danh sách file từ Cloud...</p>
    </div>
  </section>

  <!-- MỤC 4: CHEATHACK - PMT3 -->
  <section id="page-cheathack" class="page-section">
    <h2 class="text-base sm:text-lg font-bold text-fuchsia-300 mb-2">
      <i class="fa-solid fa-gamepad mr-2"></i>CheatHack - Pmt3
    </h2>
    <p class="text-xs portal-label text-slate-500 mb-6">Danh sách 100% từ Cloud Admin — tự cập nhật mỗi 7 giây</p>
    <div id="dynamicCheathackList" class="space-y-3">
      <p class="text-xs text-slate-500 text-center py-4">Đang tải CheatHack từ Cloud...</p>
    </div>
  </section>
</main>

<!-- Modal giới hạn FREE — độ nhạy -->
<div id="freeLimitModal" class="modal-overlay fixed inset-0 z-[85] hidden flex items-center justify-center p-4">
  <div class="glass-panel rounded-2xl p-8 max-w-md w-full border border-amber-500/40 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
    <p class="text-amber-400 text-sm font-bold uppercase tracking-wide mb-3"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Thông báo</p>
    <p id="freeLimitMessage" class="text-slate-200 text-sm leading-relaxed">
      Tài khoản Free chỉ được tinh chỉnh độ nhạy 1 lần duy nhất! Bạn cần mua Key VIP để tiếp tục sử dụng tính năng này.
    </p>
    <div class="mt-6 flex flex-wrap gap-3 justify-end">
      <button type="button" id="freeLimitCloseBtn" class="px-4 py-2 text-sm rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800">Đóng</button>
      <a id="freeLimitVipBtn" href="#" target="_blank" rel="noopener noreferrer"
         class="px-5 py-2 text-sm rounded-lg font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.35)]">
        Mua Key VIP Ngay
      </a>
    </div>
  </div>
</div>

<!-- Modal cảnh báo Kick / Ban -->
<div id="kickModal" class="modal-overlay fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
  <div class="kick-alert-panel rounded-2xl p-8 text-center max-w-md w-full mx-4 border border-red-500/50">
    <div class="text-5xl text-red-500 mb-4"><i class="fa-solid fa-triangle-exclamation"></i></div>
    <h3 class="text-lg font-black text-red-400 tracking-wide uppercase mb-3">Cảnh Báo Bảo Mật</h3>
    <p id="kickModalMessage" class="text-sm text-red-200/90 leading-relaxed">
      CẢNH BÁO: Thiết bị đã bị ngắt kết nối do Key bị Kick hoặc bị Khóa bởi Ban Quản Trị!
    </p>
    <p class="mt-4 text-xs text-red-400/70">Tự động chuyển về màn hình nhập Key sau <span id="kickCountdown">3</span> giây...</p>
  </div>
</div>

<!-- Modal cảnh báo VIP Download -->
<div id="vipDownloadModal" class="modal-overlay fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
  <div class="glass-panel rounded-2xl p-8 text-center max-w-md w-full mx-4 border border-amber-500/50">
    <div class="text-5xl text-amber-400 mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
      <i class="fa-solid fa-lock"></i>
    </div>
    <h3 class="text-lg font-black text-amber-400 tracking-wide uppercase mb-3">🔒 ĐẶC QUYỀN CAO CẤP!</h3>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      Tệp tin này chỉ dành cho thành viên VIP. Vui lòng kích hoạt Key VIP để mở khóa tải xuống tốc độ cao!
    </p>
    <div class="flex gap-3 justify-center">
      <button id="btnVipDownloadClose" class="px-5 py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800 transition">Đóng</button>
      <a href="https://zalo.me/0775893691" target="_blank" class="unlock-vip-btn px-5 py-2 text-sm">Mua VIP Ngay</a>
    </div>
  </div>
</div>

<!-- AI Modal — Phân Tích -->
<div id="aiModal" class="modal-overlay fixed inset-0 z-[70] hidden flex items-center justify-center">
  <div class="glass-panel rounded-2xl p-8 text-center max-w-sm mx-4 w-full">
    <div id="aiModalSpinner" class="cyber-spinner mx-auto mb-4"></div>
    <div id="aiModalSuccess" class="hidden text-5xl text-emerald-400 mb-4"><i class="fa-solid fa-circle-check"></i></div>
    <p id="aiModalStatus" class="text-sm text-violet-200 font-medium">Đang khởi động hệ thống AI...</p>
    <div id="aiLogLines" class="mx-auto"></div>
    <div id="aiProgressBar" class="mx-auto">
      <div id="aiProgressFill"></div>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- Nút Zalo nổi (mọi trang Client) — THAY SỐ: ZALO_PHONE trong file .env -->
<a href="https://zalo.me/0775893691"
   class="zalo-float-btn" target="_blank" rel="noopener noreferrer" title="Liên hệ Zalo Admin">
  <span class="zalo-float-pulse" aria-hidden="true"></span>
  <span class="zalo-float-label">Zalo</span>
</a>

<script>window.PORTAL_CONFIG = <?= json_encode($portal_config, JSON_UNESCAPED_UNICODE) ?>;</script>
<script src="js/portal.js"></script>
</body>
</html>
