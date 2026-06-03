(function () {

  'use strict';



  const CFG = window.PORTAL_CONFIG || {};



  // ── Device Lists ──
  const IOS_DEVICES = [
    'iPhone 6 - Plus',
    'iPhone 7 - Plus',
    'iPhone 8 - Plus',
    'iPhone X - Xs Max',
    'iPhone 11 - Prm',
    'iPhone 12 - Prm',
    'iPhone 13 - Prm',
    'iPhone 14 - Prm',
    'iPhone 15 - Prm',
    'iPhone 16 - Prm',
    'iPhone 17 - Prm',
  ];

  const ANDROID_DEVICES = ['Samsung', 'Oppo', 'Redmi', 'Xiaomi', 'Vivo'];

  // ── HARDCODED SENSITIVITY DATABASE ──
  // Chỉ số độ nhạy chính xác theo từng dòng máy, không random
  const sensitivityDatabase = {
    // iPhone 6/7/8 Plus — cùng thông số
    'iPhone 6 - Plus': { general: 197, redDot: 185, scope2x: 190, scope4x: 193, sniper: 130, camera: 200, fireButton: '40-50%' },
    'iPhone 7 - Plus': { general: 197, redDot: 185, scope2x: 190, scope4x: 193, sniper: 130, camera: 200, fireButton: '40-50%' },
    'iPhone 8 - Plus': { general: 197, redDot: 185, scope2x: 190, scope4x: 193, sniper: 130, camera: 200, fireButton: '40-50%' },
    // iPhone X
    'iPhone X - Xs Max': { general: 192, redDot: 193, scope2x: 195, scope4x: 175, sniper: 182, camera: 45, fireButton: '35-45%' },
    // iPhone 11–17 Premium
    'iPhone 11 - Prm':  { general: 179, redDot: 130, scope2x: 175, scope4x: 180, sniper: 130, camera: 200, fireButton: '40-50%' },
    'iPhone 12 - Prm':  { general: 195, redDot: 185, scope2x: 175, scope4x: 193, sniper:  40, camera:  45, fireButton: '40-50%' },
    'iPhone 13 - Prm':  { general: 146, redDot: 154, scope2x: 139, scope4x: 155, sniper: 135, camera: 140, fireButton: '40-50%' },
    'iPhone 14 - Prm':  { general: 144, redDot: 141, scope2x:  94, scope4x:  84, sniper:  44, camera:   0, fireButton: '40-50%' },
    'iPhone 15 - Prm':  { general: 134, redDot: 175, scope2x: 147, scope4x: 100, sniper:  12, camera:  95, fireButton: '40-50%' },
    'iPhone 16 - Prm':  { general: 178, redDot: 163, scope2x: 153, scope4x: 138, sniper: 113, camera:  83, fireButton: '40-50%' },
    'iPhone 17 - Prm':  { general: 132, redDot: 138, scope2x: 190, scope4x: 193, sniper: 130, camera: 200, fireButton: '40-50%' },
    // Android
    Samsung: { general: 168, redDot: 188, scope2x: 190, scope4x: 193, sniper: 185, camera: 186, fireButton: '40-50%' },
    Oppo:    { general: 192, redDot: 190, scope2x: 200, scope4x: 200, sniper: 150, camera: 145, fireButton: '40-50%' },
    Redmi:   { general: 189, redDot: 188, scope2x: 190, scope4x: 200, sniper: 193, camera: 200, fireButton: '40-50%' },
    Xiaomi:  { general: 193, redDot: 183, scope2x: 185, scope4x: 200, sniper: 106, camera: 140, fireButton: '40-50%' },
    Vivo:    { general: 170, redDot: 150, scope2x: 167, scope4x: 180, sniper:  50, camera:  91, fireButton: '40-50%' },
  };



  // ── Theme ──

  const html = document.documentElement;

  if (localStorage.getItem('kh_theme') === 'light') html.classList.add('light');

  document.getElementById('themeToggle')?.addEventListener('click', () => {

    html.classList.toggle('light');

    localStorage.setItem('kh_theme', html.classList.contains('light') ? 'light' : 'dark');

  });



  // ── Particle background (login screen) ──

  initParticleBackground();



  function initParticleBackground() {

    const canvas = document.getElementById('particleCanvas');

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;



    let particles = [];

    let animId = 0;

    const count = 48;



    function resize() {

      canvas.width = canvas.offsetWidth || window.innerWidth;

      canvas.height = canvas.offsetHeight || window.innerHeight;

    }



    function seed() {

      particles = [];

      for (let i = 0; i < count; i++) {

        particles.push({

          x: Math.random() * canvas.width,

          y: Math.random() * canvas.height,

          vx: (Math.random() - 0.5) * 0.35,

          vy: (Math.random() - 0.5) * 0.35,

          r: Math.random() * 1.8 + 0.4,

          a: Math.random() * 0.45 + 0.15,

        });

      }

    }



    function draw() {

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {

        p.x += p.vx;

        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;

        if (p.x > canvas.width) p.x = 0;

        if (p.y < 0) p.y = canvas.height;

        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();

        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

        ctx.fillStyle = `rgba(34, 211, 238, ${p.a})`;

        ctx.fill();

      });

      particles.forEach((p, i) => {

        for (let j = i + 1; j < particles.length; j++) {

          const q = particles[j];

          const dx = p.x - q.x;

          const dy = p.y - q.y;

          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {

            ctx.strokeStyle = `rgba(167, 139, 250, ${0.12 * (1 - dist / 90)})`;

            ctx.lineWidth = 0.5;

            ctx.beginPath();

            ctx.moveTo(p.x, p.y);

            ctx.lineTo(q.x, q.y);

            ctx.stroke();

          }

        }

      });

      animId = requestAnimationFrame(draw);

    }



    resize();

    seed();

    draw();

    window.addEventListener('resize', () => {

      resize();

      seed();

    });



    return () => cancelAnimationFrame(animId);

  }



  // ── Toggle key visibility ──

  const keyInput = document.getElementById('keyInput');

  const toggleKeyVis = document.getElementById('toggleKeyVis');

  if (toggleKeyVis && keyInput) {

    toggleKeyVis.addEventListener('click', () => {

      const isPass = keyInput.type === 'password';

      keyInput.type = isPass ? 'text' : 'password';

      toggleKeyVis.innerHTML = isPass

        ? '<i class="fa-solid fa-eye-slash"></i>'

        : '<i class="fa-solid fa-eye"></i>';

    });

  }



  const authModal = document.getElementById('authModal');

  const authStatus = document.getElementById('authStatus');

  const authSpinner = document.getElementById('authSpinner');

  const authSuccess = document.getElementById('authSuccess');



  function showAuthModal() {

    authModal?.classList.remove('hidden');

    authSpinner?.classList.remove('hidden');

    authSuccess?.classList.add('hidden');

  }

  function hideAuthModal() {

    authModal?.classList.add('hidden');

  }



  async function runAuthFlow(key) {

    showAuthModal();

    const steps = [

      'Đang check tính xác thực của key...',

      'Đang đồng bộ hóa thiết bị...',

      'Đã xác minh thành công!',

    ];

    for (let i = 0; i < steps.length; i++) {

      if (authStatus) authStatus.textContent = steps[i];

      if (i < 2) await sleep(1000);

    }

    try {

      const res = await fetch('activate.php?action=verify', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ key }),

      });

      const data = await res.json();

      // Override IP error logic for FREE and VIP keys
      if (!data.success && data.status === 'failed_ip') {
        const keyType = data.keyType || 'VIP';
        const count = data.sensitivityAdjustCount ?? 0;
        
        if (keyType === 'FREE') {
          // FREE key with IP mismatch: treat as success for first use
          if (count === 0) {
            // First use - allow login
            hideAuthModal();
            authSpinner?.classList.add('hidden');
            authSuccess?.classList.remove('hidden');
            await sleep(800);
            window.location.reload();
            return;
          }
          // Already used once - show FREE limit modal instead of IP error
          hideAuthModal();
          showFreeLimitModal(
            'Thông báo: Tài khoản Free chỉ được tinh chỉnh độ nhạy 1 lần duy nhất! Bạn cần mua Key VIP để tiếp tục sử dụng tính năng này.'
          );
          return;
        } else if (keyType === 'VIP') {
          // VIP key with IP mismatch: allow login (bypass IP check)
          hideAuthModal();
          authSpinner?.classList.add('hidden');
          authSuccess?.classList.remove('hidden');
          await sleep(800);
          window.location.reload();
          return;
        }
      }

      if (!data.success) {

        hideAuthModal();

        showLoginError(data.message || 'Đăng nhập thất bại');

        return;

      }

      authSpinner?.classList.add('hidden');

      authSuccess?.classList.remove('hidden');

      await sleep(800);
      document.body.style.transition = 'opacity 0.5s ease';
      document.body.style.opacity = '0';
      await sleep(500);
      window.location.reload();

    } catch (e) {

      hideAuthModal();

      showLoginError('Không kết nối được server');

    }

  }



  function showLoginError(msg) {

    const el = document.getElementById('loginError');

    if (el) {

      el.textContent = msg;

      el.classList.remove('hidden');

    }

  }



  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputEl = document.getElementById('keyInput');
    const key = inputEl ? inputEl.value.trim() : '';
    if (!key) return;
    document.getElementById('loginError')?.classList.add('hidden');

    runAuthFlow(key);

  });



  // ── Dashboard ──

  const drawer = document.getElementById('drawer');

  const drawerBackdrop = document.getElementById('drawerBackdrop');

  document.getElementById('menuBtn')?.addEventListener('click', openDrawer);

  drawerBackdrop?.addEventListener('click', closeDrawer);



  function openDrawer() {

    drawer?.classList.add('open');

    drawerBackdrop?.classList.add('open');

  }

  function closeDrawer() {

    drawer?.classList.remove('open');

    drawerBackdrop?.classList.remove('open');

  }



  document.querySelectorAll('[data-page]').forEach((el) => {

    el.addEventListener('click', () => {

      const page = el.dataset.page;

      document.querySelectorAll('.page-section').forEach((s) => s.classList.remove('active'));

      document.getElementById('page-' + page)?.classList.add('active');

      document.querySelectorAll('[data-page]').forEach((n) => {

        n.classList.remove('text-cyan-400');

        if (!n.classList.contains('text-slate-300')) n.classList.add('text-slate-300');

      });

      el.classList.add('text-cyan-400');

      el.classList.remove('text-slate-300');

      closeDrawer();

      if (page === 'files') loadSystemFiles();
      if (page === 'cheathack') loadCheathackFiles();

    });

  });



  function escapeHtml(str) {

    return String(str)

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;');

  }



  function renderFileBadge(badgeType) {

    const t = (badgeType || 'NONE').toUpperCase();

    if (t === 'NONE') return '';

    const cls =

      t === 'PRO' ? 'file-badge file-badge-pro badge-pro-wiggle' :

      t === 'VIP' ? 'file-badge file-badge-vip badge-vip' :

      t === 'FREE' ? 'file-badge file-badge-free badge-free' : 'file-badge';

    return `<span class="${cls}">${t}</span>`;

  }



  let portalFilesPollTimer = null;
  let localSensitivityCount = typeof CFG.sensitivityAdjustCount === 'number' ? CFG.sensitivityAdjustCount : 0;

  function isRealPortalFile(f) {
    const id = String(f._id || f.id || '');
    return id && !id.startsWith('demo-mock') && !id.startsWith('mock-');
  }

  async function fetchFilesFromApi(action) {
    const res = await fetch(`activate.php?action=${action}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    const files = Array.isArray(data.files) ? data.files : [];
    return files.filter(isRealPortalFile);
  }

  async function fetchSystemFilesFromApi() {
    return fetchFilesFromApi('system_files');
  }

  async function fetchCheathackFilesFromApi() {
    return fetchFilesFromApi('cheathack_files');
  }

  function buildFileCardHtml(f) {
    const id = f._id || f.id || '';
    return `
        <div class="file-card dynamic-file-card" data-dynamic-file-id="${escapeHtml(id)}">
          <div class="flex flex-wrap justify-between items-start gap-3">
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-bold portal-heading leading-snug">
                ${renderFileBadge(f.badgeType)}${escapeHtml(f.fileName)}
              </h3>
              <p class="text-xs portal-label text-slate-400 mt-2">${escapeHtml(f.description || '—')}</p>
              <p class="text-xs text-slate-500 mt-2"><i class="fa-regular fa-calendar mr-1"></i>Ngày Upload: ${escapeHtml(f.uploadDate || '—')}</p>
            </div>
            <a href="${escapeHtml(f.downloadLink)}" target="_blank" rel="noopener noreferrer" class="cyber-download-btn shrink-0 ${isVip ? 'vip-download-trigger' : ''}">
              <i class="fa-solid fa-download"></i> Download
            </a>
          </div>
        </div>`;
  }

  function renderDynamicFilesEmpty(containerId, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<p class="text-xs portal-label text-slate-500 text-center py-6">${emptyText}</p>`;
  }

  function renderDynamicFilesList(files, containerId, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!files.length) {
      renderDynamicFilesEmpty(containerId, emptyText);
      return;
    }
    container.innerHTML = files.map(buildFileCardHtml).join('');
    container.querySelectorAll('.vip-download-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const keyType = String(CFG.keyType || 'VIP').toUpperCase();
        if (keyType === 'FREE') {
          e.preventDefault();
          document.getElementById('vipDownloadModal')?.classList.remove('hidden');
        }
      });
    });
  }

  function syncFileCardsInContainer(files, containerId, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const nextIds = new Set(files.map((f) => String(f._id || f.id)));
    const prevCards = [...container.querySelectorAll('.dynamic-file-card')];
    let removedAny = false;

    prevCards.forEach((card) => {
      const id = card.getAttribute('data-dynamic-file-id');
      if (id && !nextIds.has(id)) {
        removedAny = true;
        card.classList.add('file-card-fade-out');
        setTimeout(() => card.remove(), 420);
      }
    });

    if (removedAny) {
      setTimeout(() => {
        files.forEach((f) => {
          const id = String(f._id || f.id);
          if (!container.querySelector(`[data-dynamic-file-id="${id}"]`)) {
            container.insertAdjacentHTML('beforeend', buildFileCardHtml(f));
          }
        });
        if (!container.querySelector('.dynamic-file-card') && !files.length) {
          renderDynamicFilesEmpty(containerId, emptyText);
        }
      }, 450);
    } else {
      renderDynamicFilesList(files, containerId, emptyText);
    }
  }

  async function loadPortalFileList(containerId, fetchFn, emptyText, showLoading) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (showLoading !== false) {
      container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Đang tải từ Cloud...</p>';
    }

    try {
      const files = await fetchFn();
      renderDynamicFilesList(files, containerId, emptyText);
    } catch (_) {
      container.innerHTML =
        '<p class="text-xs text-red-400 text-center py-4">Không tải được — kiểm tra Node.js port 3000.</p>';
    }
  }

  function loadSystemFiles(showLoading) {
    return loadPortalFileList(
      'dynamicFilesList',
      fetchSystemFilesFromApi,
      'Chưa có file hệ thống — Admin thêm trong tab Cấu hình.',
      showLoading
    );
  }

  function loadCheathackFiles(showLoading) {
    return loadPortalFileList(
      'dynamicCheathackList',
      fetchCheathackFilesFromApi,
      'Chưa có CheatHack — Admin thêm trong tab Cấu hình (cột phải).',
      showLoading
    );
  }

  function startPortalFilesPolling() {
    if (portalFilesPollTimer) return;
    portalFilesPollTimer = setInterval(async () => {
      if (!CFG.loggedIn) return;
      try {
        const [sysFiles, chFiles] = await Promise.all([
          fetchSystemFilesFromApi(),
          fetchCheathackFilesFromApi(),
        ]);
        const sysEl = document.getElementById('dynamicFilesList');
        const chEl = document.getElementById('dynamicCheathackList');
        if (sysEl && (sysEl.querySelector('.dynamic-file-card') || sysFiles.length)) {
          syncFileCardsInContainer(
            sysFiles,
            'dynamicFilesList',
            'Chưa có file hệ thống — Admin thêm trong tab Cấu hình.'
          );
        }
        if (chEl && (chEl.querySelector('.dynamic-file-card') || chFiles.length)) {
          syncFileCardsInContainer(
            chFiles,
            'dynamicCheathackList',
            'Chưa có CheatHack — Admin thêm trong tab Cấu hình (cột phải).'
          );
        }
      } catch (_) {
        /* giữ UI */
      }
    }, 7000);
  }

  function showFreeLimitModal(message) {
    const modal = document.getElementById('freeLimitModal');
    const msgEl = document.getElementById('freeLimitMessage');
    const vipBtn = document.getElementById('freeLimitVipBtn');
    if (msgEl && message) msgEl.textContent = message;
    if (vipBtn && CFG.vipPurchaseUrl) vipBtn.href = CFG.vipPurchaseUrl;
    modal?.classList.remove('hidden');
  }

  document.getElementById('freeLimitCloseBtn')?.addEventListener('click', () => {
    document.getElementById('freeLimitModal')?.classList.add('hidden');
  });



  if (CFG.loggedIn && CFG.expiredAt) {

    updateCountdown();

    setInterval(updateCountdown, 1000);

  }



  function updateCountdown() {

    const el = document.getElementById('countdown');

    if (!el || !CFG.expiredAt) return;

    const diff = Math.max(0, new Date(CFG.expiredAt).getTime() - Date.now());

    if (diff <= 0) {

      el.textContent = 'HẾT HẠN';

      return;

    }

    const d = Math.floor(diff / 86400000);

    const h = Math.floor((diff % 86400000) / 3600000);

    const m = Math.floor((diff % 3600000) / 60000);

    const s = Math.floor((diff % 60000) / 1000);

    el.textContent = `${d} ngày ${pad(h)}:${pad(m)}:${pad(s)}`;

  }



  let heartbeatBusy = false;

  let sessionRevoked = false;



  if (CFG.loggedIn) {

    setInterval(checkKicked, 5000);

    checkKicked();

    initNetworkLatency();

  }



  async function checkKicked() {

    if (sessionRevoked || heartbeatBusy) return;

    heartbeatBusy = true;

    try {

      const res = await fetch('activate.php?action=check_session', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: '{}',

      });

      const data = await res.json();

      // Override IP error for session check - allow FREE and VIP to proceed
      if (data.success === false && data.status === 'failed_ip') {
        heartbeatBusy = false;
        return; // Ignore IP mismatch, allow session to continue
      }

      if (data.success === false || data.kicked) {

        handleSessionRevoked(

          data.message

            || 'CẢNH BÁO: Thiết bị đã bị ngắt kết nối do Key bị Kick hoặc bị Khóa bởi Ban Quản Trị!'

        );

      }

    } catch (_) { /* ignore */ }

    finally {

      heartbeatBusy = false;

    }

  }



  function handleSessionRevoked(message) {

    if (sessionRevoked) return;

    sessionRevoked = true;

    const modal = document.getElementById('kickModal');

    const msgEl = document.getElementById('kickModalMessage');

    const countEl = document.getElementById('kickCountdown');

    if (msgEl) msgEl.textContent = message;

    modal?.classList.remove('hidden');

    let sec = 3;

    const tick = setInterval(() => {

      sec -= 1;

      if (countEl) countEl.textContent = String(Math.max(0, sec));

      if (sec <= 0) {

        clearInterval(tick);

        window.location.href = 'activate.php?logout=1';

      }

    }, 1000);

  }



  function initNetworkLatency() {

    const el = document.getElementById('networkLatency');

    if (!el) return;

    setTimeout(() => {

      const ms = 18 + Math.floor(Math.random() * 18);

      el.textContent = ms + 'ms';

    }, 800 + Math.floor(Math.random() * 700));

  }



  // ── Devices & OB53 AI ──

  let selectedPlatform = 'ios';

  let selectedDevice = '';

  const selectedConditions = new Set();



  function renderDevices() {

    const grid = document.getElementById('deviceGrid');

    if (!grid) return;

    const list = selectedPlatform === 'ios' ? IOS_DEVICES : ANDROID_DEVICES;

    grid.innerHTML = list

      .map(

        (d) =>

          `<button type="button" class="device-chip rounded-lg px-3 py-2 text-xs text-left ${

            selectedDevice === d ? 'active' : ''

          }" data-device="${d}">${d}</button>`

      )

      .join('');

    grid.querySelectorAll('[data-device]').forEach((btn) => {

      btn.addEventListener('click', () => {

        selectedDevice = btn.dataset.device || '';

        document.getElementById('ob53ResultCard')?.classList.remove('visible');

        renderDevices();

      });

    });

  }



  document.getElementById('tabIos')?.addEventListener('click', () => {

    selectedPlatform = 'ios';

    selectedDevice = '';

    document.getElementById('tabIos')?.classList.add('border-cyan-400', 'text-cyan-300');

    document.getElementById('tabAndroid')?.classList.remove('border-cyan-400', 'text-cyan-300');

    document.getElementById('ob53ResultCard')?.classList.remove('visible');

    renderDevices();

  });



  document.getElementById('tabAndroid')?.addEventListener('click', () => {

    selectedPlatform = 'android';

    selectedDevice = '';

    document.getElementById('tabAndroid')?.classList.add('border-cyan-400', 'text-cyan-300');

    document.getElementById('tabIos')?.classList.remove('border-cyan-400', 'text-cyan-300');

    document.getElementById('ob53ResultCard')?.classList.remove('visible');

    renderDevices();

  });



  document.querySelectorAll('.condition-box').forEach((box) => {

    box.addEventListener('click', () => {

      const id = box.dataset.condition;

      if (!id) return;

      if (selectedConditions.has(id)) {

        selectedConditions.delete(id);

        box.classList.remove('selected');

      } else {

        selectedConditions.add(id);

        box.classList.add('selected');

      }

    });

  });



  if (document.getElementById('deviceGrid')) renderDevices();



  function fmtPct(val) {

    if (val === undefined || val === null) return '—';

    if (typeof val === 'string') return val;

    return val + '%';

  }



  // ── Animate a number counting up ──
  function animateCount(el, targetVal) {
    if (!el) return;
    // If it's a string (e.g. '40-50%'), just set it directly
    if (typeof targetVal === 'string') {
      el.innerHTML = `<span class="result-value-anim">${targetVal}</span>`;
      return;
    }
    const duration = 600;
    const start = performance.now();
    const from = 0;
    const to = Number(targetVal) || 0;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      const current = Math.round(from + (to - from) * ease);
      el.innerHTML = `<span class="result-value-anim">${current}</span>`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function showOb53Results(deviceName, payload) {
    // Luôn ưu tiên database hardcode local — bỏ qua dữ liệu từ server nếu không có thông số cần thiết
    const localProfile = sensitivityDatabase[deviceName];
    const profile = localProfile || payload;

    if (!profile) {
      alert('Không tìm thấy profile OB53 cho thiết bị này');
      return;
    }

    const label = document.getElementById('ob53DeviceLabel');
    if (label) label.textContent = deviceName;

    // Set & animate các giá trị số đếm lên
    animateCount(document.getElementById('rGeneral'),  profile.general);
    animateCount(document.getElementById('rRedDot'),   profile.redDot);
    animateCount(document.getElementById('rScope2x'),  profile.scope2x);
    animateCount(document.getElementById('rScope4x'),  profile.scope4x);
    animateCount(document.getElementById('rSniper'),   profile.sniperScope ?? profile.sniper);
    animateCount(document.getElementById('rCamera'),   profile.camera ?? 0);
    // Fire button là chuỗi
    animateCount(document.getElementById('rFire'),     profile.fireButtonSize || profile.fireButton || '—');

    const card = document.getElementById('ob53ResultCard');
    if (card) {
      card.classList.remove('visible');
      void card.offsetWidth; // reflow
      card.classList.add('visible');
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }



  const aiModal = document.getElementById('aiModal');

  const aiModalStatus = document.getElementById('aiModalStatus');

  const aiModalSpinner = document.getElementById('aiModalSpinner');

  const aiModalSuccess = document.getElementById('aiModalSuccess');



  // ── AI Typewriter Animation Helpers ──
  function resetAiModal() {
    const spinner = document.getElementById('aiModalSpinner');
    const success = document.getElementById('aiModalSuccess');
    const status  = document.getElementById('aiModalStatus');
    const logEl   = document.getElementById('aiLogLines');
    const barFill = document.getElementById('aiProgressFill');
    if (spinner) spinner.classList.remove('hidden');
    if (success) success.classList.add('hidden');
    if (status)  status.textContent = 'Đang khởi động hệ thống AI...';
    if (logEl)   logEl.innerHTML = '';
    if (barFill) barFill.style.width = '0%';
  }

  async function runAiTypewriterSteps() {
    const steps = [
      { text: '⚙️ Đang phân tích tình trạng thiết bị...', cls: 'step-1', progress: '32%'  },
      { text: '🤖 Đang khởi chạy lõi phân tích AI Deep Learning...', cls: 'step-2', progress: '66%'  },
      { text: '🔒 Đang rà soát bước cuối và mã hóa thông số...', cls: 'step-3', progress: '95%'  },
    ];
    const logEl   = document.getElementById('aiLogLines');
    const barFill = document.getElementById('aiProgressFill');
    const status  = document.getElementById('aiModalStatus');

    for (const step of steps) {
      await sleep(1100);
      if (logEl) {
        const line = document.createElement('div');
        line.className = `ai-log-line ${step.cls}`;
        line.textContent = step.text;
        logEl.appendChild(line);
        // trigger transition
        requestAnimationFrame(() => requestAnimationFrame(() => line.classList.add('visible')));
      }
      if (barFill) barFill.style.width = step.progress;
      if (status)  status.textContent  = step.text.replace(/^.{2} /, ''); // strip emoji
    }
    await sleep(900); // pause before result
    if (barFill) barFill.style.width = '100%';
  }

  document.getElementById('btnAiAnalyze')?.addEventListener('click', async () => {

    if (!selectedDevice) {
      alert('Vui lòng chọn thiết bị trước khi phân tích!');
      return;
    }

    // ── Kiểm tra giới hạn FREE key ──
    const keyType = String(CFG.keyType || 'VIP').toUpperCase();
    const isFreeLimitReached = (keyType === 'FREE' && localSensitivityCount >= 1);

    const deviceLocked = selectedDevice;
    const resultCard = document.getElementById('ob53ResultCard');
    resultCard?.classList.remove('visible', 'blur-preview');

    // Hiện AI modal với typewriter
    const aiModalEl = document.getElementById('aiModal');
    aiModalEl?.classList.remove('hidden');
    resetAiModal();

    // Chạy song song: typewriter steps + fetch API
    const [data, res] = await Promise.all([
      fetch('activate.php?action=ai_tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          deviceModel: deviceLocked,
          dpi: 400,
          screenRefreshRate: 120,
          playStyle: 'rusher',
          conditions: [...selectedConditions],
        }),
      }).then(async r => ({ json: await r.json().catch(() => ({})), ok: r.ok, status: r.status }))
       .catch(() => ({ json: {}, ok: false, status: 500 })),
      runAiTypewriterSteps(),
    ]).then(([fetchResult]) => [fetchResult.json, { ok: fetchResult.ok, status: fetchResult.status }]);

    const isSuccess = data.success === true || data.status === 'success';

    // ── Xử lý kết quả ──
    if (!isSuccess) {
      // Bỏ qua lỗi IP mismatch → hiện kết quả local
      if (data.message && data.message.includes('IP không khớp')) {
        localSensitivityCount += 1;
        const spinnerEl = document.getElementById('aiModalSpinner');
        const successEl = document.getElementById('aiModalSuccess');
        const statusEl  = document.getElementById('aiModalStatus');
        if (spinnerEl) spinnerEl.classList.add('hidden');
        if (successEl) successEl.classList.remove('hidden');
        if (statusEl)  statusEl.textContent = 'Phân tích thành công!';
        await sleep(600);
        aiModalEl?.classList.add('hidden');
        showOb53Results(deviceLocked, null);
        return;
      }

      // Giới hạn FREE
      if (data.code === 'FREE_SENSITIVITY_LIMIT' || res.status === 403 || isFreeLimitReached) {
        if (data && typeof data.sensitivityAdjustCount === 'number') localSensitivityCount = data.sensitivityAdjustCount;
        else localSensitivityCount += 1;
        
        aiModalEl?.classList.add('hidden');
        
        // Hiện bảng kết quả nhưng bị BLUR
        showOb53Results(deviceLocked, null);
        resultCard?.classList.add('blur-preview');
        return;
      }

      // Lỗi khác → fallback local nếu có
      if (sensitivityDatabase[deviceLocked]) {
        localSensitivityCount += 1;
      } else {
        aiModalEl?.classList.add('hidden');
        alert(data.message || 'Phân tích thất bại. Vui lòng thử lại.');
        return;
      }
    } else {
      // Thành công → cập nhật count
      if (typeof data.sensitivityAdjustCount === 'number') localSensitivityCount = data.sensitivityAdjustCount;
      else localSensitivityCount += 1;
    }

    // Hiện success icon
    const spinnerEl2 = document.getElementById('aiModalSpinner');
    const successEl2 = document.getElementById('aiModalSuccess');
    const statusEl2  = document.getElementById('aiModalStatus');
    if (spinnerEl2) spinnerEl2.classList.add('hidden');
    if (successEl2) successEl2.classList.remove('hidden');
    if (statusEl2)  statusEl2.textContent = '✅ Phân tích thành công!';

    await sleep(650);
    aiModalEl?.classList.add('hidden');

    // Hiển thị kết quả OB53 (luôn dùng hardcode local database)
    showOb53Results(deviceLocked, data);
    if (isFreeLimitReached) {
      resultCard?.classList.add('blur-preview');
    }
  });

  // Đóng Modal VIP Download
  document.getElementById('btnVipDownloadClose')?.addEventListener('click', () => {
    document.getElementById('vipDownloadModal')?.classList.add('hidden');
  });

  // ── ẢO HÓA THÔNG BÁO TÀI KHOẢN (TOAST NOTIFICATION NỔ ĐƠN ẢO) ──
  function showFakeToast() {
    const messages = [
      `🔥 Người dùng vinh***${Math.floor(Math.random() * 90) + 10} vừa kích hoạt thành công Key VIP 30 ngày!`,
      `⚡ Hệ thống vừa phân tích độ nhạy AI cho iPhone 14 Pro Max.`,
      `🔒 Anti-Cheat Bypass vừa bảo mật an toàn cho user ID #${Math.floor(Math.random() * 9000) + 1000}`,
      `🔥 Khách hàng khang***${Math.floor(Math.random() * 90) + 10} vừa gia hạn gói Master Pro!`,
      `🤖 AI Core vừa tối ưu hóa màn hình 120Hz cho Samsung S23 Ultra.`
    ];
    
    const container = document.getElementById('globalToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'global-toast';
    toast.innerHTML = `<i class="fa-solid fa-bolt text-amber-400 text-lg"></i> <span>${messages[Math.floor(Math.random() * messages.length)]}</span>`;
    
    container.appendChild(toast);
    
    // Animate In
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    
    // Remove after 4s
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 4500);
  }

  // Trigger ngẫu nhiên mỗi 15-30 giây
  setInterval(() => {
    showFakeToast();
  }, Math.floor(Math.random() * (30000 - 15000 + 1) + 15000));
  
  // Fake Ping fluctuation
  const pingEl = document.querySelector('.ping-status-bar span');
  if (pingEl) {
    setInterval(() => {
      const ping = Math.floor(Math.random() * 15) + 8; // 8 - 22ms
      pingEl.innerHTML = `Mạng: Ổn định (${ping}ms) | Trạng thái Server AI: Hoạt động 99.9%`;
    }, 2000);
  }


  function sleep(ms) {

    return new Promise((r) => setTimeout(r, ms));

  }

  function pad(n) {

    return String(n).padStart(2, '0');

  }

  if (CFG.loggedIn) {
    startPortalFilesPolling();
    if (document.getElementById('page-files')?.classList.contains('active')) {
      loadSystemFiles();
    }
    if (document.getElementById('page-cheathack')?.classList.contains('active')) {
      loadCheathackFiles();
    }
    const vipBtn = document.getElementById('freeLimitVipBtn');
    if (vipBtn && CFG.vipPurchaseUrl) vipBtn.href = CFG.vipPurchaseUrl;
  }

})();


