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

    if ($action === 'music_config') {
        try {
            $cfg_path = __DIR__ . '/public/music/_config.json';
            if (!file_exists($cfg_path)) {
                portal_json_response(['success' => true, 'current' => null, 'volume' => 0.3, 'autoplay' => true, 'externalUrl' => '']);
            }
            $cfg = json_decode(file_get_contents($cfg_path), true) ?? [];
            portal_json_response(array_merge(['success' => true, 'current' => null, 'volume' => 0.3, 'autoplay' => true, 'externalUrl' => ''], $cfg));
        } catch (Throwable $e) {
            portal_json_response(['success' => true, 'current' => null, 'volume' => 0.3, 'autoplay' => true]);
        }
    }

    if ($action === 'makefile_template' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['cloud_key'])) {
        portal_json_response(['success' => false, 'message' => 'Chưa đăng nhập'], 401);
    }
    $deviceName = trim((string) ($_GET['deviceName'] ?? ''));
    if ($deviceName === '') {
        portal_json_response(['success' => false, 'message' => 'Thiếu tên thiết bị'], 400);
    }
    try {
        $result = node_get_makefile_template($deviceName);
        portal_json_response($result);
    } catch (Throwable $e) {
        portal_json_response(['success' => false, 'message' => 'Lỗi kết nối server']);
    }
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
  <style>
    @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
    .drawer-nav-btn { transition: all 0.2s ease; }
    #countdownRing { transition: stroke-dashoffset 1s ease; }
  </style>
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
<!-- ═══ MÀN HÌNH ĐĂNG NHẬP NÂNG CẤP ═══ -->
<div class="min-h-screen flex flex-col login-hero-wrap">
  <canvas id="particleCanvas" aria-hidden="true"></canvas>

  <!-- Header nâng cấp -->
  <header class="border-b border-cyan-500/15 glass-panel sticky top-0 z-40 login-form-layer">
    <div class="max-w-5xl mx-auto px-4 py-4">
      <div class="flex flex-col items-center">
        <h1 class="text-xl sm:text-3xl font-black tracking-[0.25em] neon-title-pulse portal-heading bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 bg-clip-text" style="background-size:200%;animation:gradientShift 4s ease infinite">
          KHANG HUYNH CLOUD
        </h1>
        <p class="text-[10px] text-slate-500 tracking-[0.4em] mt-1 uppercase">AI-Powered Sensitivity System v3.8</p>
      </div>

      <!-- Stats row đẹp hơn -->
      <div class="mt-4 grid grid-cols-4 gap-2 text-xs max-w-lg mx-auto">
        <div class="glass-panel rounded-xl px-2 py-2.5 text-center border border-cyan-500/10 hover:border-cyan-500/25 transition">
          <div class="text-cyan-400 font-bold text-sm">10 Gbps</div>
          <div class="text-slate-600 text-[10px] mt-0.5">Băng thông</div>
        </div>
        <div class="glass-panel rounded-xl px-2 py-2.5 text-center border border-emerald-500/10 hover:border-emerald-500/25 transition">
          <div class="text-emerald-400 font-bold text-sm">99.9%</div>
          <div class="text-slate-600 text-[10px] mt-0.5">Uptime</div>
        </div>
        <div class="glass-panel rounded-xl px-2 py-2.5 text-center border border-violet-500/10 hover:border-violet-500/25 transition">
          <div class="text-violet-400 font-bold text-sm">v3.8</div>
          <div class="text-slate-600 text-[10px] mt-0.5">AI Build</div>
        </div>
        <div class="glass-panel rounded-xl px-2 py-2.5 text-center border border-amber-500/10 hover:border-amber-500/25 transition">
          <div class="text-amber-400 font-bold text-sm">124K+</div>
          <div class="text-slate-600 text-[10px] mt-0.5">VIP Users</div>
        </div>
      </div>

      <!-- Live ticker -->
      <div class="live-notify-bar mt-3 login-form-layer">
        <div class="live-notify-track">
          <span class="live-notify-text">⚡ [LIVE] 1,420 người dùng VIP đang kích hoạt thành công &nbsp;&nbsp;|&nbsp;&nbsp; 🔒 Hệ thống bảo mật SHA-256 đang hoạt động &nbsp;&nbsp;|&nbsp;&nbsp; 🤖 AI Engine OB53 v3.8 — ONLINE 100%</span>
          <span class="live-notify-text" aria-hidden="true">⚡ [LIVE] 1,420 người dùng VIP đang kích hoạt thành công &nbsp;&nbsp;|&nbsp;&nbsp; 🔒 Hệ thống bảo mật SHA-256 đang hoạt động &nbsp;&nbsp;|&nbsp;&nbsp; 🤖 AI Engine OB53 v3.8 — ONLINE 100%</span>
        </div>
      </div>
    </div>
  </header>

  <main class="flex-1 flex items-center justify-center p-4 login-form-layer">
    <div class="w-full max-w-md">
      <!-- Card đăng nhập nâng cấp -->
      <div class="glass-panel rounded-3xl p-8 shadow-2xl border border-cyan-500/15 relative overflow-hidden"
           style="box-shadow:0 0 60px rgba(0,245,255,0.06),0 25px 50px rgba(0,0,0,0.5)">
        <!-- Top glow line -->
        <div class="absolute top-0 left-0 right-0 h-px" style="background:linear-gradient(90deg,transparent,rgba(0,245,255,0.6),transparent)"></div>

        <div class="text-center mb-7">
          <!-- Animated shield icon -->
          <div class="relative inline-flex w-20 h-20 rounded-full items-center justify-center mb-4"
               style="background:linear-gradient(135deg,rgba(0,245,255,0.1),rgba(192,132,252,0.1));border:1px solid rgba(0,245,255,0.25);box-shadow:0 0 30px rgba(0,245,255,0.1)">
            <i class="fa-solid fa-shield-halved text-3xl text-cyan-400" style="filter:drop-shadow(0 0 8px rgba(0,245,255,0.5))"></i>
            <div class="absolute inset-0 rounded-full animate-ping opacity-10" style="background:rgba(0,245,255,0.3);animation-duration:3s"></div>
          </div>
          <h2 class="text-base font-black tracking-widest text-cyan-300 uppercase">Xác Thực Bảo Mật</h2>
          <p class="mt-2 text-xs text-slate-500 leading-relaxed">Nhập Key kích hoạt để truy cập hệ thống Cloud</p>
        </div>

        <form id="loginForm" class="space-y-4">
          <div>
            <label class="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Mã Key Truy Cập</label>
            <div class="key-conic-wrap">
              <div class="animated-neon-border rounded-xl">
                <div class="flex relative z-10 bg-zinc-950/60 rounded-xl overflow-hidden backdrop-blur-md">
                  <input type="text" id="keyInput" name="keyString" placeholder="Nhập Key kích hoạt..." required
                    class="flex-1 bg-transparent px-4 py-3.5 text-cyan-300 font-mono text-sm focus:outline-none placeholder-zinc-600 border-none ring-0">
                  <button type="submit"
                    class="px-5 py-3 font-bold text-xs tracking-wider border-l border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15 transition-all">
                    ➤
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p id="loginError" class="text-sm text-red-400 hidden text-center"></p>
          <button type="submit"
            class="w-full rounded-xl py-4 font-black text-sm tracking-widest text-black transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
            style="background:linear-gradient(135deg,#00f5ff,#7c3aed,#00f5ff);background-size:200%;animation:gradientShift 3s ease infinite;box-shadow:0 0 24px rgba(0,245,255,0.25)">
            KÍCH HOẠT HỆ THỐNG
          </button>
        </form>

        <!-- Features mini list -->
        <div class="mt-6 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-lg py-2 px-1" style="background:rgba(0,245,255,0.04);border:1px solid rgba(0,245,255,0.08)">
            <i class="fa-solid fa-bolt text-amber-400 text-xs mb-1 block"></i>
            <span class="text-[9px] text-slate-500">AI Phân tích</span>
          </div>
          <div class="rounded-lg py-2 px-1" style="background:rgba(192,132,252,0.04);border:1px solid rgba(192,132,252,0.08)">
            <i class="fa-solid fa-file-code text-violet-400 text-xs mb-1 block"></i>
            <span class="text-[9px] text-slate-500">File Cloud</span>
          </div>
          <div class="rounded-lg py-2 px-1" style="background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.08)">
            <i class="fa-solid fa-wand-magic-sparkles text-amber-400 text-xs mb-1 block"></i>
            <span class="text-[9px] text-slate-500">Make File</span>
          </div>
        </div>

        <p class="mt-5 text-center">
          
<a href="https://zalo.me/0775893691" target="_blank" rel="noopener" class="zalo-link text-xs font-semibold inline-flex items-center gap-2">
            <i class="fa-brands fa-telegram"></i> Liên hệ Admin mua Key VIP
          </a>
        </p>
      </div>
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
<aside id="drawer" class="drawer-panel fixed top-0 left-0 h-full w-64 glass-panel z-50 flex flex-col"
  style="border-right:1px solid rgba(0,245,255,0.08);box-shadow:4px 0 24px rgba(0,0,0,0.4)">
  <!-- Drawer header -->
  <div class="px-5 pt-6 pb-4 border-b border-cyan-500/10">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
           style="background:linear-gradient(135deg,rgba(0,245,255,0.15),rgba(124,58,237,0.15));border:1px solid rgba(0,245,255,0.2)">
        <i class="fa-solid fa-shield-halved text-cyan-400 text-sm"></i>
      </div>
      <div>
        <div class="text-xs font-bold text-cyan-300 tracking-wider">KHANG HUYNH</div>
        <div class="text-[9px] text-slate-600">Cloud System v3.8</div>
      </div>
    </div>
    <!-- Key type badge -->
    <div class="mt-3 rounded-lg py-2 px-3 text-center text-[10px] font-bold tracking-widest
      <?= $session_key_type === 'VIP' ? 'text-amber-400' : 'text-emerald-400' ?>"
      style="background:<?= $session_key_type === 'VIP' ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)' ?>;
             border:1px solid <?= $session_key_type === 'VIP' ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)' ?>">
      <?= $session_key_type === 'VIP' ? '👑 VIP PREMIUM' : '🎫 MEMBER FREE' ?>
    </div>
  </div>
  <!-- Nav items -->
  <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
    <button data-page="account" class="drawer-nav-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm transition-all group text-cyan-400" style="background:rgba(0,245,255,0.08);border:1px solid rgba(0,245,255,0.15)">
      <i class="fa-solid fa-id-card text-cyan-400 group-hover:scale-110 transition-transform"></i>
      <span class="font-semibold">Tài Khoản</span>
    </button>
    <button data-page="ai" class="drawer-nav-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm transition-all text-slate-400 hover:text-violet-300 hover:bg-violet-500/8 border border-transparent hover:border-violet-500/15">
      <i class="fa-solid fa-microchip"></i>
      <span>Phân Tích AI</span>
    </button>
    <button data-page="files" class="drawer-nav-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm transition-all text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/8 border border-transparent hover:border-emerald-500/15">
      <i class="fa-solid fa-file-code"></i>
      <span>File Tinh Chỉnh</span>
    </button>
    <button data-page="cheathack" class="drawer-nav-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm transition-all text-slate-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/8 border border-transparent hover:border-fuchsia-500/15">
      <i class="fa-solid fa-gamepad"></i>
      <span>CheatHack - Pmt3</span>
    </button>
    <button data-page="makefile" class="drawer-nav-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm transition-all text-amber-400 hover:bg-amber-500/8 border border-transparent hover:border-amber-500/15">
      <i class="fa-solid fa-wand-magic-sparkles"></i>
      <span class="font-semibold">Make File</span>
      <span class="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">HOT</span>
    </button>
  </nav>
  <!-- Drawer footer -->
  <div class="px-4 py-4 border-t border-cyan-500/10">
    <form method="POST" action="activate.php">
      <input type="hidden" name="action" value="logout">
      <button type="submit" class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition border border-transparent hover:border-red-500/15">
        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
      </button>
    </form>
  </div>
</aside>

<header class="glass-panel border-b border-cyan-500/10 sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-4"
  style="box-shadow:0 2px 20px rgba(0,0,0,0.3)">
  <div class="flex items-center gap-3">
    <button id="menuBtn" class="text-cyan-400 text-lg p-2 rounded-lg hover:bg-cyan-500/10 transition"><i class="fa-solid fa-bars"></i></button>
    <div>
      <span class="font-black text-cyan-300 tracking-widest text-sm">KHANG HUYNH</span>
      <span class="text-slate-600 text-xs ml-2">CLOUD v3.8</span>
    </div>
  </div>
  <!-- Right side: key badge + ping -->
  <div class="flex items-center gap-3">
    <div class="flex items-center gap-1.5 text-[10px] text-emerald-400">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="hidden sm:inline">ONLINE</span>
    </div>
    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg
      <?= $session_key_type === 'VIP' ? 'text-amber-400' : 'text-emerald-400' ?>"
      style="background:<?= $session_key_type === 'VIP' ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)' ?>;
             border:1px solid <?= $session_key_type === 'VIP' ? 'rgba(251,191,36,0.25)' : 'rgba(52,211,153,0.25)' ?>">
      <?= $session_key_type === 'VIP' ? '👑 VIP' : '🎫 FREE' ?>
    </span>
  </div>
</header>

<main class="max-w-4xl mx-auto p-4 pb-16">

  <!-- NOTIFICATION POPUP -->
  <div id="notifPopupWrap" class="fixed inset-0 z-[200] hidden flex items-end justify-center p-4 pointer-events-none">
    <div id="notifPopupBox" class="pointer-events-auto w-full max-w-sm rounded-2xl p-5 shadow-2xl border"
      style="background:linear-gradient(135deg,rgba(14,20,42,0.98),rgba(8,12,28,0.99));backdrop-filter:blur(20px);transform:translateY(100px);opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1)">
      <div class="flex items-start gap-3">
        <div id="notifPopupIcon" class="text-2xl shrink-0">📢</div>
        <div class="flex-1 min-w-0">
          <p id="notifPopupTitle" class="text-sm font-bold text-white mb-1">Thông báo</p>
          <p id="notifPopupMsg" class="text-xs text-zinc-400 leading-relaxed"></p>
        </div>
        <button onclick="closeNotifPopup()" class="text-zinc-600 hover:text-zinc-300 shrink-0 text-lg leading-none">×</button>
      </div>
    </div>
  </div>

  <!-- MỤC 1: TÀI KHOẢN NÂNG CẤP -->
  <section id="page-account" class="page-section active">
    <div class="grid md:grid-cols-3 gap-4">
      <!-- Countdown dạng vòng tròn -->
      <div class="md:col-span-1 glass-panel rounded-2xl p-5 border border-violet-500/25 flex flex-col items-center justify-center text-center"
           style="box-shadow:0 0 30px rgba(192,132,252,0.05)">
        <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Thời Gian Còn Lại</p>
        <!-- SVG circular countdown -->
        <div class="relative w-28 h-28 mb-3">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(192,132,252,0.1)" stroke-width="6"/>
            <circle id="countdownRing" cx="50" cy="50" r="42" fill="none" stroke="url(#ringGrad)" stroke-width="6"
              stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s ease"/>
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#7c3aed"/>
                <stop offset="100%" stop-color="#00f5ff"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <p id="countdown" class="text-sm font-mono font-bold text-violet-300 leading-tight">--:--:--</p>
            <p class="text-[9px] text-slate-600 mt-0.5"><?= (int) $session_days_left ?>d còn lại</p>
          </div>
        </div>
        <!-- Mini stats -->
        <div class="w-full grid grid-cols-2 gap-2 mt-1">
          <div class="rounded-lg py-1.5 text-center" style="background:rgba(0,245,255,0.06);border:1px solid rgba(0,245,255,0.1)">
            <div class="text-cyan-400 font-bold text-xs">Active</div>
            <div class="text-slate-600 text-[9px]">Trạng thái</div>
          </div>
          <div class="rounded-lg py-1.5 text-center" style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.1)">
            <div class="text-emerald-400 font-bold text-xs">100%</div>
            <div class="text-slate-600 text-[9px]">Bảo mật</div>
          </div>
        </div>
      </div>
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
              <span class="status-ping-wrap"><span class="status-ping-ring"></span><span class="status-ping-core"></span></span>
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
            <p class="tech-stat-line mt-1 text-violet-300"><i class="fa-solid fa-bolt text-amber-400"></i> Băng thông riêng cấp VIP: Dedicated 10 Gbps (Bypass Secure)</p>
          </div>
          <div class="sm:col-span-2 premium-stat-row">
            <span class="portal-label text-slate-500 text-xs">Trạng thái Bảo mật mã nguồn</span>
            <p class="tech-stat-line mt-1 text-emerald-400/95">
              <span class="status-ping-wrap shrink-0" style="width:10px;height:10px"><span class="status-ping-ring"></span><span class="status-ping-core" style="width:6px;height:6px"></span></span>
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
            <p class="tech-stat-line mt-1 text-cyan-300/90"><i class="fa-solid fa-server text-violet-400"></i> Server Cluster: Node-SG03 (Hồ Chí Minh VIP Route)</p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">Bảo mật mã hóa</span>
            <p class="tech-stat-line mt-1 text-emerald-400/90"><i class="fa-solid fa-shield-check text-emerald-400"></i> Mã hóa cấp độ quân sự SHA-256 Verified</p>
          </div>
          <div>
            <span class="portal-label text-slate-500 text-xs">Thuật toán tối ưu</span>
            <p class="tech-stat-line mt-1 text-violet-300/90"><i class="fa-solid fa-brain text-fuchsia-400"></i> AI Core: Deep Learning Meta OB53 v2.0</p>
          </div>
          <div class="sm:col-span-2">
            <span class="portal-label text-slate-500 text-xs">Hết hạn</span>
            <p class="mt-1 font-mono text-sm text-amber-300/90"><?= e(format_vn_datetime($session_expired_at)) ?></p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- THÔNG BÁO NEON -->
  <div id="notifNeonWrap" style="display:none;max-width:900px;margin:0 auto 20px;padding:0 16px">
    <style>
      @keyframes neonPulse{0%,100%{box-shadow:0 0 8px rgba(0,245,255,.4),0 0 20px rgba(0,245,255,.15);border-color:rgba(0,245,255,.5)}50%{box-shadow:0 0 18px rgba(0,245,255,.8),0 0 40px rgba(0,245,255,.3);border-color:rgba(0,245,255,.95)}}
      @keyframes neonPulseG{0%,100%{box-shadow:0 0 8px rgba(52,211,153,.4),0 0 20px rgba(52,211,153,.15);border-color:rgba(52,211,153,.5)}50%{box-shadow:0 0 18px rgba(52,211,153,.8),0 0 40px rgba(52,211,153,.3);border-color:rgba(52,211,153,.95)}}
      @keyframes neonPulseY{0%,100%{box-shadow:0 0 8px rgba(251,191,36,.4),0 0 20px rgba(251,191,36,.15);border-color:rgba(251,191,36,.5)}50%{box-shadow:0 0 18px rgba(251,191,36,.8),0 0 40px rgba(251,191,36,.3);border-color:rgba(251,191,36,.95)}}
      @keyframes neonPulseR{0%,100%{box-shadow:0 0 8px rgba(244,63,94,.4),0 0 20px rgba(244,63,94,.15);border-color:rgba(244,63,94,.5)}50%{box-shadow:0 0 18px rgba(244,63,94,.8),0 0 40px rgba(244,63,94,.3);border-color:rgba(244,63,94,.95)}}
      .nn-info{background:rgba(0,245,255,.05);border:1px solid;border-radius:14px;padding:14px 16px;animation:neonPulse 2.5s ease infinite}
      .nn-success{background:rgba(52,211,153,.05);border:1px solid;border-radius:14px;padding:14px 16px;animation:neonPulseG 2.5s ease infinite}
      .nn-warning{background:rgba(251,191,36,.05);border:1px solid;border-radius:14px;padding:14px 16px;animation:neonPulseY 2.5s ease infinite}
      .nn-danger{background:rgba(244,63,94,.05);border:1px solid;border-radius:14px;padding:14px 16px;animation:neonPulseR 2.5s ease infinite}
    </style>
    <div id="notifNeonList" style="display:flex;flex-direction:column;gap:10px"></div>
  </div>

  <!-- MỤC 2: PHÂN TÍCH AI -->
  <section id="page-ai" class="page-section">
    <h2 class="ai-title-nowrap text-base sm:text-lg font-bold text-cyan-300 mb-6">Phân Tích AI - Fine-tune sensitivity</h2>
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
        <div class="text-5xl text-amber-400 mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"><i class="fa-solid fa-lock"></i></div>
        <button class="unlock-vip-btn" onclick="window.open('https://zalo.me/0775893691', '_blank')">🔓 Mở Khóa Thông Số VIP Ngay</button>
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
    <h2 class="text-base sm:text-lg font-bold text-cyan-300 mb-2"><i class="fa-solid fa-file-code mr-2"></i>File Tinh Chỉnh Hệ Thống</h2>
    <p class="text-xs portal-label text-slate-500 mb-6">Danh sách 100% từ Cloud Admin — tự cập nhật mỗi 7 giây</p>
    <div id="dynamicFilesList" class="space-y-3">
      <p class="text-xs text-slate-500 text-center py-4">Đang tải danh sách file từ Cloud...</p>
    </div>
  </section>

  <!-- MỤC 4: CHEATHACK - PMT3 -->
  <section id="page-cheathack" class="page-section">
    <h2 class="text-base sm:text-lg font-bold text-fuchsia-300 mb-2"><i class="fa-solid fa-gamepad mr-2"></i>CheatHack - Pmt3</h2>
    <p class="text-xs portal-label text-slate-500 mb-6">Danh sách 100% từ Cloud Admin — tự cập nhật mỗi 7 giây</p>
    <div id="dynamicCheathackList" class="space-y-3">
      <p class="text-xs text-slate-500 text-center py-4">Đang tải CheatHack từ Cloud...</p>
    </div>
  </section>

  <!-- MỤC 5: FILE MAKE THEO YÊU CẦU -->
  <section id="page-makefile" class="page-section">
    <div class="mb-6">
      <h2 class="text-xl font-bold portal-heading text-amber-400 flex items-center gap-3">
        <i class="fa-solid fa-wand-magic-sparkles"></i> File Make Theo Yêu Cầu
      </h2>
      <p class="text-xs text-slate-500 mt-1 font-mono">Tạo file tinh chỉnh cá nhân hóa theo thiết bị của bạn</p>
    </div>

    <!-- THÔNG TIN THIẾT BỊ -->
    <div class="glass-panel rounded-2xl p-6 mb-5 border border-amber-500/20 shadow-[0_0_30px_rgba(251,191,36,0.06)]">
      <h3 class="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <i class="fa-solid fa-mobile-screen"></i> Thông Tin Thiết Bị
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-xs portal-label text-slate-500 mb-2 block">Tên Thiết Bị iOS</label>
          <div class="relative">
            <select id="iosDeviceSelect" class="w-full appearance-none bg-zinc-900/80 border border-cyan-500/30 text-cyan-300 rounded-xl px-4 py-3 pr-10 text-sm font-mono focus:outline-none focus:border-cyan-400 cursor-pointer transition">
              <option value="">-- Chọn iPhone --</option>
              <option>iPhone 6 Plus</option><option>iPhone 7</option><option>iPhone 7 Plus</option>
              <option>iPhone 8</option><option>iPhone 8 Plus</option><option>iPhone X</option>
              <option>iPhone XS</option><option>iPhone XS Max</option><option>iPhone XR</option>
              <option>iPhone 11</option><option>iPhone 11 Pro</option><option>iPhone 11 Pro Max</option>
              <option>iPhone 12</option><option>iPhone 12 Pro</option><option>iPhone 12 Pro Max</option>
              <option>iPhone 13</option><option>iPhone 13 Pro</option><option>iPhone 13 Pro Max</option>
              <option>iPhone 14</option><option>iPhone 14 Pro</option><option>iPhone 14 Pro Max</option>
              <option>iPhone 15</option><option>iPhone 15 Pro</option><option>iPhone 15 Pro Max</option>
              <option>iPhone 16</option><option>iPhone 16 Pro</option><option>iPhone 16 Pro Max</option>
              <option>iPhone 17</option><option>iPhone 17 Pro</option><option>iPhone 17 Pro Max</option>
            </select>
            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 text-xs pointer-events-none"></i>
          </div>
        </div>
        <div>
          <label class="text-xs portal-label text-slate-500 mb-2 block">Tên Thiết Bị Android</label>
          <div class="relative">
            <select id="adrDeviceSelect" class="w-full appearance-none bg-zinc-900/80 border border-violet-500/30 text-violet-300 rounded-xl px-4 py-3 pr-10 text-sm font-mono focus:outline-none focus:border-violet-400 cursor-pointer transition">
              <option value="">-- Chọn Android --</option>
              <option>Samsung Galaxy S21</option><option>Samsung Galaxy S22</option>
              <option>Samsung Galaxy S23</option><option>Samsung Galaxy S24</option>
              <option>Samsung Galaxy S24 Ultra</option><option>Samsung Galaxy A54</option>
              <option>Samsung Galaxy A55</option><option>Xiaomi 13</option>
              <option>Xiaomi 14</option><option>Xiaomi 14 Pro</option>
              <option>Xiaomi Redmi Note 12</option><option>Xiaomi Redmi Note 13</option>
              <option>OPPO Reno 10</option><option>OPPO Reno 11</option>
              <option>OPPO Find X6</option><option>Vivo V27</option>
              <option>Vivo V29</option><option>Realme GT 5</option>
              <option>OnePlus 12</option><option>Google Pixel 8</option>
              <option>Google Pixel 8 Pro</option>
            </select>
            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 text-xs pointer-events-none"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- CHỌN CHỨC NĂNG -->
    <div class="glass-panel rounded-2xl p-6 mb-5 border border-cyan-500/15 shadow-[0_0_30px_rgba(0,245,255,0.04)]">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
          <i class="fa-solid fa-sliders"></i> Chọn Chức Năng
        </h3>
        <span id="featureCountBadge" class="text-xs font-mono px-3 py-1 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
          <?php if ($session_key_type === 'VIP'): ?>VIP: 0/2 chức năng<?php else: ?>🔒 Key Free<?php endif; ?>
        </span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="featureGrid">
        <?php
        $features = [
          ['id'=>'nhe_tam',  'icon'=>'fa-feather',       'name'=>'Nhẹ Tâm',        'color'=>'text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10'],
          ['id'=>'bam_dau',  'icon'=>'fa-crosshairs',    'name'=>'Bám Đầu',        'color'=>'text-violet-300 border-violet-500/40 hover:border-violet-400 hover:bg-violet-500/10'],
          ['id'=>'dam_tam',  'icon'=>'fa-shield-halved', 'name'=>'Đầm Tâm',        'color'=>'text-amber-300 border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10'],
          ['id'=>'fix_rung', 'icon'=>'fa-hand',          'name'=>'Fix Rung',       'color'=>'text-emerald-300 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-500/10'],
          ['id'=>'fix_lo',   'icon'=>'fa-ban',           'name'=>'Fix Lố Đầu',    'color'=>'text-red-300 border-red-500/40 hover:border-red-400 hover:bg-red-500/10'],
          ['id'=>'tang_fps', 'icon'=>'fa-gauge-high',    'name'=>'Tăng FPS',       'color'=>'text-yellow-300 border-yellow-500/40 hover:border-yellow-400 hover:bg-yellow-500/10'],
          ['id'=>'nhay_man', 'icon'=>'fa-display',       'name'=>'Nhạy Màn 120Hz', 'color'=>'text-pink-300 border-pink-500/40 hover:border-pink-400 hover:bg-pink-500/10'],
          ['id'=>'anti_lag', 'icon'=>'fa-bolt',          'name'=>'Anti Lag',       'color'=>'text-orange-300 border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10'],
        ];
        foreach ($features as $f): ?>
        <button type="button" data-feature="<?= $f['id'] ?>"
          class="feature-btn relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-zinc-900/60 transition-all duration-200 <?= $f['color'] ?> <?= $session_key_type !== 'VIP' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer' ?>">
          <i class="fa-solid <?= $f['icon'] ?> text-xl"></i>
          <span class="text-xs font-semibold text-center leading-tight"><?= $f['name'] ?></span>
          <div class="feature-check absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 hidden items-center justify-center">
            <i class="fa-solid fa-check text-[9px] text-black"></i>
          </div>
        </button>
        <?php endforeach; ?>
      </div>
      <p class="text-xs text-slate-600 mt-4 text-center">
        <?php if ($session_key_type === 'VIP'): ?>
          ✨ Key VIP — chọn tối đa 2 chức năng — giới hạn 1 lần/ngày
        <?php else: ?>
          🔒 Key Free — không thể chọn chức năng. <a href="https://zalo.me/0775893691" target="_blank" class="text-amber-400 underline">Nâng cấp VIP</a> để sử dụng
        <?php endif; ?>
      </p>
    </div>

    <!-- NÚT TẠO FILE NÂNG CẤP -->
    <div class="text-center">
      <button id="startMakeFileBtn"
        class="relative inline-flex items-center gap-3 px-12 py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
        style="background:linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.8));color:#000;box-shadow:0 0 40px rgba(251,191,36,0.25),0 8px 24px rgba(0,0,0,0.3)">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>Bắt Đầu Tạo File</span>
        <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75"></span>
      </button>
      <p class="text-[10px] text-slate-600 mt-3 font-mono">Giới hạn 1 lần/ngày · Chỉ dành cho Key VIP</p>
    </div>
  </section>

</main>

<!-- Modals cũ giữ nguyên -->
<div id="freeLimitModal" class="modal-overlay fixed inset-0 z-[85] hidden flex items-center justify-center p-4">
  <div class="glass-panel rounded-2xl p-8 max-w-md w-full border border-amber-500/40 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
    <p class="text-amber-400 text-sm font-bold uppercase tracking-wide mb-3"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Thông báo</p>
    <p id="freeLimitMessage" class="text-slate-200 text-sm leading-relaxed">Tài khoản Free chỉ được tinh chỉnh độ nhạy 1 lần duy nhất! Bạn cần mua Key VIP để tiếp tục sử dụng tính năng này.</p>
    <div class="mt-6 flex flex-wrap gap-3 justify-end">
      <button type="button" id="freeLimitCloseBtn" class="px-4 py-2 text-sm rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800">Đóng</button>
      <a id="freeLimitVipBtn" href="#" target="_blank" rel="noopener noreferrer" class="px-5 py-2 text-sm rounded-lg font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.35)]">Mua Key VIP Ngay</a>
    </div>
  </div>
</div>

<div id="kickModal" class="modal-overlay fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
  <div class="kick-alert-panel rounded-2xl p-8 text-center max-w-md w-full mx-4 border border-red-500/50">
    <div class="text-5xl text-red-500 mb-4"><i class="fa-solid fa-triangle-exclamation"></i></div>
    <h3 class="text-lg font-black text-red-400 tracking-wide uppercase mb-3">Cảnh Báo Bảo Mật</h3>
    <p id="kickModalMessage" class="text-sm text-red-200/90 leading-relaxed">CẢNH BÁO: Thiết bị đã bị ngắt kết nối do Key bị Kick hoặc bị Khóa bởi Ban Quản Trị!</p>
    <p class="mt-4 text-xs text-red-400/70">Tự động chuyển về màn hình nhập Key sau <span id="kickCountdown">3</span> giây...</p>
  </div>
</div>

<div id="vipDownloadModal" class="modal-overlay fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
  <div class="glass-panel rounded-2xl p-8 text-center max-w-md w-full mx-4 border border-amber-500/50">
    <div class="text-5xl text-amber-400 mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"><i class="fa-solid fa-lock"></i></div>
    <h3 class="text-lg font-black text-amber-400 tracking-wide uppercase mb-3">🔒 ĐẶC QUYỀN CAO CẤP!</h3>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">Tệp tin này chỉ dành cho thành viên VIP. Vui lòng kích hoạt Key VIP để mở khóa tải xuống tốc độ cao!</p>
    <div class="flex gap-3 justify-center">
      <button id="btnVipDownloadClose" class="px-5 py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800 transition">Đóng</button>
      <a href="https://zalo.me/0775893691" target="_blank" class="unlock-vip-btn px-5 py-2 text-sm">Mua VIP Ngay</a>
    </div>
  </div>
</div>

<div id="aiModal" class="modal-overlay fixed inset-0 z-[70] hidden flex items-center justify-center">
  <div class="glass-panel rounded-2xl p-8 text-center max-w-sm mx-4 w-full">
    <div id="aiModalSpinner" class="cyber-spinner mx-auto mb-4"></div>
    <div id="aiModalSuccess" class="hidden text-5xl text-emerald-400 mb-4"><i class="fa-solid fa-circle-check"></i></div>
    <p id="aiModalStatus" class="text-sm text-violet-200 font-medium">Đang khởi động hệ thống AI...</p>
    <div id="aiLogLines" class="mx-auto"></div>
    <div id="aiProgressBar" class="mx-auto"><div id="aiProgressFill"></div></div>
  </div>
</div>

<!-- MODAL TẠO FILE NÂNG CẤP -->
<div id="makefileModal" class="modal-overlay fixed inset-0 z-[80] hidden flex items-center justify-center p-4">
  <div class="w-full max-w-md mx-4 relative" style="filter:drop-shadow(0 0 40px rgba(251,191,36,0.15))">
    <div class="glass-panel rounded-3xl p-7 border text-center relative overflow-hidden"
         style="border-color:rgba(251,191,36,0.2);background:linear-gradient(135deg,rgba(14,20,42,0.97),rgba(8,12,28,0.99))">
      <!-- Animated top border -->
      <div class="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl overflow-hidden">
        <div style="height:100%;background:linear-gradient(90deg,transparent,#fbbf24,#00f5ff,#c084fc,transparent);animation:gradientShift 2s linear infinite;background-size:200%"></div>
      </div>

      <!-- PROCESSING STATE -->
      <div id="makefileProcessing">
        <div class="relative inline-flex mb-5">
          <div class="cyber-spinner"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <i class="fa-solid fa-microchip text-amber-400 text-sm"></i>
          </div>
        </div>
        <h3 class="text-xs font-black text-amber-400 mb-1 tracking-[0.2em] uppercase">⚙️ AI Engine Processing</h3>
        <p class="text-[10px] text-slate-600 mb-4 font-mono">KhangHuynh Cloud v3.8 — Đang xử lý...</p>
        <!-- Terminal log -->
        <div id="makefileCodeLines"
          class="text-left rounded-2xl p-4 h-52 overflow-hidden font-mono text-[11px] leading-relaxed"
          style="background:rgba(0,0,0,0.7);border:1px solid rgba(251,191,36,0.15)"></div>
        <!-- Progress bar -->
        <div class="mt-4 relative">
          <div class="h-1.5 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.06)">
            <div id="makefileProgress"
              class="h-full rounded-full transition-all duration-500"
              style="width:0%;background:linear-gradient(90deg,#fbbf24,#00f5ff,#c084fc);box-shadow:0 0 12px rgba(0,245,255,0.4)"></div>
          </div>
        </div>
      </div>

      <!-- DONE STATE -->
      <div id="makefileDone" class="hidden">
        <div class="relative inline-flex mb-5">
          <div class="text-7xl text-amber-400" style="filter:drop-shadow(0 0 24px rgba(251,191,36,0.5))">
            <i class="fa-solid fa-file-circle-check"></i>
          </div>
          <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center" style="box-shadow:0 0 10px rgba(52,211,153,0.5)">
            <i class="fa-solid fa-check text-[9px] text-black"></i>
          </div>
        </div>
        <h3 class="text-base font-black text-amber-400 mb-1 tracking-widest">FILE SẴN SÀNG!</h3>
        <p class="text-xs text-slate-500 mb-6 leading-relaxed">AI Engine đã tối ưu hóa file tinh chỉnh<br>cá nhân hóa cho thiết bị của bạn</p>
        <a id="makefileDownloadBtn" href="#" download="KhangHuynh-Custom-File.txt"
          class="inline-flex items-center gap-3 px-10 py-3.5 rounded-2xl font-black text-sm text-black hover:opacity-90 hover:scale-[1.02] transition-all"
          style="background:linear-gradient(135deg,#fbbf24,#f59e0b);box-shadow:0 0 24px rgba(251,191,36,0.35)">
          <i class="fa-solid fa-download"></i> Tải File Về
        </a>
        <button onclick="document.getElementById('makefileModal').classList.add('hidden')"
          class="block mx-auto mt-3 text-xs text-slate-600 hover:text-slate-400 transition">
          <i class="fa-solid fa-xmark mr-1"></i>Đóng
        </button>
      </div>
    </div>
  </div>
</div>

<?php endif; ?>



<a href="https://zalo.me/0775893691" class="zalo-float-btn" target="_blank" rel="noopener noreferrer" title="Liên hệ Zalo Admin">
  <span class="zalo-float-pulse" aria-hidden="true"></span>
  <span class="zalo-float-label">Zalo</span>
</a>

<script>window.PORTAL_CONFIG = <?= json_encode($portal_config, JSON_UNESCAPED_UNICODE) ?>;</script>
<script src="js/portal.js"></script>
<script>
// ── Circular countdown ring ──
(function() {
  const ring = document.getElementById('countdownRing');
  if (!ring) return;
  const expiredAt = '<?= $session_expired_at ?>';
  if (!expiredAt) return;
  const expMs = new Date(expiredAt).getTime();
  const totalDays = <?= max(1, (int)$session_days_left) ?>;
  const totalMs = totalDays * 24 * 3600 * 1000;
  const circumference = 264;
  function updateRing() {
    const remainMs = Math.max(0, expMs - Date.now());
    const pct = remainMs / totalMs;
    ring.style.strokeDashoffset = circumference * (1 - pct);
    const color = pct > 0.5 ? '#34d399' : pct > 0.2 ? '#fbbf24' : '#f43f5e';
    ring.style.stroke = color;
  }
  updateRing();
  setInterval(updateRing, 10000);
})();

// ── Active drawer nav highlight ──
(function() {
  document.querySelectorAll('.drawer-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.drawer-nav-btn').forEach(b => {
        b.style.background = '';
        b.style.border = '1px solid transparent';
      });
      const page = btn.dataset.page;
      const colors = {account:'rgba(0,245,255,0.08)',ai:'rgba(124,58,237,0.08)',files:'rgba(52,211,153,0.08)',cheathack:'rgba(217,70,239,0.08)',makefile:'rgba(251,191,36,0.08)'};
      const borders = {account:'rgba(0,245,255,0.2)',ai:'rgba(124,58,237,0.2)',files:'rgba(52,211,153,0.2)',cheathack:'rgba(217,70,239,0.2)',makefile:'rgba(251,191,36,0.2)'};
      if (colors[page]) {
        btn.style.background = colors[page];
        btn.style.border = `1px solid ${borders[page]}`;
      }
    });
  });
})();
</script>
<script>
// ── MAKEFILE PAGE ──
(function() {
  const isVip = <?= json_encode($session_key_type === 'VIP') ?>;
  const MAX_FEATURES = 2;
  let selectedFeatures = [];
  let usedToday = false;

  document.querySelectorAll('.feature-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isVip) {
        showToast('🔒 Cần Key VIP để sử dụng chức năng này!', 'error');
        return;
      }
      const id = btn.dataset.feature;
      const check = btn.querySelector('.feature-check');
      if (selectedFeatures.includes(id)) {
        selectedFeatures = selectedFeatures.filter(f => f !== id);
        btn.classList.remove('ring-2','ring-cyan-400','!bg-cyan-500/15');
        check.classList.add('hidden'); check.classList.remove('flex');
      } else {
        if (selectedFeatures.length >= MAX_FEATURES) {
          showToast('⚠️ Tối đa 2 chức năng cho Key VIP!', 'warning');
          return;
        }
        selectedFeatures.push(id);
        btn.classList.add('ring-2','ring-cyan-400','!bg-cyan-500/15');
        check.classList.remove('hidden'); check.classList.add('flex');
      }
      document.getElementById('featureCountBadge').textContent = 'VIP: ' + selectedFeatures.length + '/2 chức năng';
    });
  });

  document.getElementById('startMakeFileBtn')?.addEventListener('click', () => {
    if (!isVip) {
      showToast('🔒 Cần Key VIP để tạo file! Liên hệ admin mua key.', 'error');
      return;
    }
    if (usedToday) {
      showToast('⏳ Bạn đã dùng chức năng này hôm nay rồi!', 'warning');
      return;
    }
    const ios = document.getElementById('iosDeviceSelect').value;
    const adr = document.getElementById('adrDeviceSelect').value;
    if (!ios && !adr) {
      showToast('📱 Vui lòng chọn thiết bị trước!', 'warning');
      return;
    }
    startMakefile(ios, adr);
  });

  async function startMakefile(ios, adr) {
    const modal = document.getElementById('makefileModal');
    const processing = document.getElementById('makefileProcessing');
    const done = document.getElementById('makefileDone');
    const lines = document.getElementById('makefileCodeLines');
    const progress = document.getElementById('makefileProgress');
    modal.classList.remove('hidden');
    processing.classList.remove('hidden');
    done.classList.add('hidden');
    lines.innerHTML = '';
    progress.style.width = '0%';

    const colors = ['#00f5ff','#c084fc','#ffd700','#00ff88','#ff2d7e','#fbbf24','#67e8f9','#e879f9','#86efac','#fb923c'];
    const device = ios || adr;
    const codeLogs = [
      '> [INIT] KhangHuynh AI Engine v3.8 — ONLINE',
      '> [SCAN] Detecting device profile: ' + device,
      '> [LOAD] Loading OB53 sensitivity matrix...',
      '> [AI]   Running neural calibration layer...',
      '> [CALC] Computing recoil compensation vectors...',
      '> [OPT]  Optimizing gyroscope sensitivity curve...',
      '> [PATCH] Injecting anti-lag micro-patches...',
      '> [SYNC] Calculating frame-sync delta (120Hz)...',
      '> [BUILD] Compiling custom binary payload...',
      '> [CHECK] Running validation checks... PASSED',
      '> [CRYPT] Encrypting output with SHA-256...',
      '> [PACK]  Packaging final config file...',
      '> [FETCH] Fetching personalized file from Cloud...',
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= codeLogs.length) { clearInterval(interval); return; }
      const line = document.createElement('div');
      line.style.color = colors[i % colors.length];
      line.style.marginBottom = '3px';
      line.textContent = codeLogs[i];
      line.style.opacity = '0';
      line.style.transform = 'translateX(-8px)';
      line.style.transition = 'all 0.3s ease';
      lines.appendChild(line);
      setTimeout(() => { line.style.opacity = '1'; line.style.transform = 'translateX(0)'; }, 50);
      lines.scrollTop = lines.scrollHeight;
      progress.style.width = ((i + 1) / codeLogs.length * 100) + '%';
      i++;
    }, 1500);

    let realLink = null;
    let errorMsg = null;
    try {
      const res = await fetch('activate.php?action=makefile_template&deviceName=' + encodeURIComponent(device));
      const data = await res.json();
      if (data.success && data.downloadLink) {
        realLink = data.downloadLink;
      } else {
        errorMsg = data.message || 'Admin chưa upload file cho thiết bị này!';
      }
    } catch (e) {
      errorMsg = 'Không kết nối được server. Thử lại sau!';
    }

    const minWait = codeLogs.length * 1500 + 800;
setTimeout(() => {
  clearInterval(interval);
  progress.style.width = '100%';
  usedToday = true;
  processing.classList.add('hidden');
  done.classList.remove('hidden');
  if (realLink) {
        const btn = document.getElementById('makefileDownloadBtn');
        btn.href = realLink;
        btn.removeAttribute('download');
        btn.target = '_blank';
        btn.textContent = '⬇️ Tải File Về';
      } else {
        done.innerHTML = `
          <div class="text-5xl text-red-400 mb-4"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h3 class="text-sm font-bold text-red-400 mb-2">⚠️ Chưa Có File!</h3>
          <p class="text-xs text-slate-400 mb-6">${errorMsg}</p>
          <button onclick="document.getElementById('makefileModal').classList.add('hidden')"
            class="px-8 py-3 rounded-xl bg-zinc-700 text-white font-bold text-sm">Đóng</button>
        `;
      }
    }, minWait);
  }
})();
</script>
<script>
// ══ THÔNG BÁO TỰ ĐỘNG ══
(function() {
  const icons = {info:'ℹ️', success:'✅', warning:'⚠️', danger:'🚨'};
  const colors = {
    info: 'rgba(0,245,255,0.2)',
    success: 'rgba(52,211,153,0.2)',
    warning: 'rgba(251,191,36,0.2)',
    danger: 'rgba(244,63,94,0.2)'
  };
  let queue = [];
  let showing = false;

  function showNext() {
    if (!queue.length || showing) return;
    showing = true;
    const n = queue.shift();
    const wrap = document.getElementById('notifPopupWrap');
    const box = document.getElementById('notifPopupBox');
    const icon = document.getElementById('notifPopupIcon');
    const title = document.getElementById('notifPopupTitle');
    const msg = document.getElementById('notifPopupMsg');
    if (!wrap) return;
    icon.textContent = icons[n.type] || '📢';
    title.textContent = n.title;
    msg.textContent = n.message;
    box.style.borderColor = colors[n.type] || 'rgba(0,245,255,0.2)';
    wrap.classList.remove('hidden');
    setTimeout(() => { box.style.transform='translateY(0)'; box.style.opacity='1'; }, 50);
    setTimeout(() => closeNotifPopup(), 5000);
  }

  window.closeNotifPopup = function() {
    const wrap = document.getElementById('notifPopupWrap');
    const box = document.getElementById('notifPopupBox');
    box.style.transform = 'translateY(100px)';
    box.style.opacity = '0';
    setTimeout(() => { wrap.classList.add('hidden'); showing=false; showNext(); }, 400);
  };

  // Load thông báo từ server
  fetch('http://127.0.0.1:3000/api/features/active-notifications')
    .then(r => r.json())
    .then(data => {
      const shown = JSON.parse(sessionStorage.getItem('shownNotifs')||'[]');
      const news = (data.notifications||[]).filter(n => n.isActive && !shown.includes(n._id));
      if (!news.length) return;
      sessionStorage.setItem('shownNotifs', JSON.stringify([...shown, ...news.map(n=>n._id)]));
      queue = news;
      setTimeout(showNext, 2000);
    })
    .catch(()=>{});
})();

// ══ RANK BADGE ══
(function() {
  const daysLeft = <?= (int)$session_days_left ?>;
  const totalUsed = 30 - Math.max(0, daysLeft);
  let rank, color, icon;
  if (totalUsed >= 90) { rank='LEGEND'; color='#fbbf24'; icon='👑'; }
  else if (totalUsed >= 30) { rank='ELITE'; color='#c084fc'; icon='💎'; }
  else if (totalUsed >= 7) { rank='PRO'; color='#00f5ff'; icon='⚡'; }
  else { rank='ROOKIE'; color='#34d399'; icon='🌱'; }

  const el = document.getElementById('userRankBadge');
  if (el) {
    el.textContent = icon + ' ' + rank;
    el.style.color = color;
    el.style.borderColor = color.replace(')', ',0.3)').replace('rgb','rgba');
  }
})();
</script>
<script>
(function(){
  var nCfg = {
    info:   {icon:'ℹ️',color:'#67e8f9',cls:'nn-info'},
    success:{icon:'✅',color:'#6ee7b7',cls:'nn-success'},
    warning:{icon:'⚠️',color:'#fde68a',cls:'nn-warning'},
    danger: {icon:'🚨',color:'#fca5a5',cls:'nn-danger'}
  };
  function renderNeonNotifs(list){
    var wrap=document.getElementById('notifNeonWrap');
    var el=document.getElementById('notifNeonList');
    if(!wrap||!el||!list.length)return;
    el.innerHTML=list.map(function(n){
      var c=nCfg[n.type]||nCfg.info;
      return '<div class="'+c.cls+'" style="display:flex;align-items:flex-start;gap:10px">'+
        '<span style="font-size:18px;flex-shrink:0">'+c.icon+'</span>'+
        '<div style="flex:1;min-width:0">'+
        '<div style="color:'+c.color+';font-size:12px;font-weight:800;margin-bottom:4px">'+n.title+'</div>'+
        '<div style="color:#94a3b8;font-size:11px;line-height:1.6">'+n.message+'</div>'+
        '</div>'+
        '<button onclick="this.parentElement.parentElement.remove();var l=document.getElementById('notifNeonList');if(l&&!l.children.length)document.getElementById('notifNeonWrap').style.display='none'" '+
        'style="background:none;border:none;cursor:pointer;color:#4b5563;font-size:18px;padding:0;flex-shrink:0;line-height:1">&times;</button>'+
        '</div>';
    }).join('');
    wrap.style.display='block';
  }
  setTimeout(function(){
    fetch('http://127.0.0.1:3000/api/features/active-notifications')
      .then(function(r){return r.json();})
      .then(function(d){if((d.notifications||[]).length)renderNeonNotifs(d.notifications);})
      .catch(function(){});
  },800);
})();
</script>
</body>
</html>
