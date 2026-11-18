// İndirilenler - Chrome GM3 Popup & Full-Tab UI (xinghaix-backed state & lifecycle)

(() => {
  const params = new URLSearchParams(window.location.search);
  const isTabMode = params.get('mode') === 'tab';
  const modeClass = isTabMode ? 'mode-tab' : 'mode-popup';
  document.documentElement.classList.add(modeClass);
  document.body.classList.add(modeClass);

  const PROJECTION_KEY = 'downloads_projection';

  const DEFAULT_SETTINGS = {
    hideNativeBubble: true,
    showBadge: true,
    notifyOnComplete: false,
    theme: 'system',
    resolvedLight: false
  };

  const SAFE_DANGER_TYPES = new Set([
    'safe',
    'accepted',
    'allowlistedByPolicy',
    'deepScannedSafe'
  ]);

  const WAITING_DANGER_TYPES = new Set([
    'asyncScanning',
    'asyncLocalPasswordScanning'
  ]);

  const BLOCKED_DANGER_TYPES = new Set([
    'blockedTooLarge',
    'sensitiveContentBlock',
    'blockedScanFailed',
    'forceSaveToGdrive',
    'forceSaveToGDrive',
    'forceSaveToOnedrive',
    'forceSaveToOneDrive'
  ]);

  const BLOCKED_DANGER_ERRORS = new Set([
    'FILE_BLOCKED',
    'FILE_SECURITY_CHECK_FAILED',
    'FILE_VIRUS_INFECTED'
  ]);

  const CATEGORY_EXTS = {
    archive: new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'cab', 'tgz', 'zst']),
    app: new Set(['exe', 'msi', 'msix', 'appx', 'bat', 'cmd', 'ps1', 'sh', 'apk', 'dmg', 'deb', 'rpm', 'appimage', 'jar']),
    media: new Set(['mp4', 'mkv', 'webm', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'ts', 'mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'opus']),
    image: new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif', 'tiff', 'heic', 'psd']),
    doc: new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md', 'json', 'xml', 'html', 'htm', 'epub', 'sql', 'log'])
  };

  const ICONS = {
    link: `<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    folder: `<svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
    retry: `<svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    more: `<svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`
  };

  const ERROR_LABELS = {
    USER_CANCELED: 'İptal edildi',
    USER_SHUTDOWN: 'Kapatıldı',
    NETWORK_FAILED: 'Ağ hatası',
    NETWORK_TIMEOUT: 'Ağ zaman aşımı',
    NETWORK_DISCONNECTED: 'Bağlantı kesildi',
    NETWORK_SERVER_DOWN: 'Sunucuya ulaşılamıyor',
    SERVER_FAILED: 'Sunucu hatası',
    SERVER_NO_RANGE: 'Devam ettirilemiyor',
    SERVER_BAD_CONTENT: 'Dosya bulunamadı',
    SERVER_UNAUTHORIZED: 'Yetki gerekli',
    SERVER_FORBIDDEN: 'Erişim yasaklandı',
    FILE_NO_SPACE: 'Yetersiz disk alanı',
    FILE_ACCESS_DENIED: 'Erişim reddedildi',
    FILE_BLOCKED: 'Chrome tarafından engellendi',
    FILE_SECURITY_CHECK_FAILED: 'Güvenlik denetimi başarısız',
    FILE_VIRUS_INFECTED: 'Virüs algılandı'
  };

  const el = {
    popupHeader: document.getElementById('popupHeader'),
    bubbleLiveSub: document.getElementById('bubbleLiveSub'),
    btnTogglePopupSearch: document.getElementById('btnTogglePopupSearch'),
    btnPopupNewDl: document.getElementById('btnPopupNewDl'),
    btnPopupMore: document.getElementById('btnPopupMore'),
    btnPopupClose: document.getElementById('btnPopupClose'),

    tabHeader: document.getElementById('tabHeader'),
    tabSearchInput: document.getElementById('tabSearchInput'),
    btnClearTabSearch: document.getElementById('btnClearTabSearch'),
    btnTabNewDl: document.getElementById('btnTabNewDl'),
    btnTabFolder: document.getElementById('btnTabFolder'),
    btnTabMore: document.getElementById('btnTabMore'),

    filterSection: document.getElementById('filterSection'),
    popupSearchInput: document.getElementById('popupSearchInput'),
    btnClearPopupSearch: document.getElementById('btnClearPopupSearch'),
    categoryBar: document.getElementById('categoryBar'),

    newDownloadDrawer: document.getElementById('newDownloadDrawer'),
    btnCloseNewDl: document.getElementById('btnCloseNewDl'),
    newDlUrls: document.getElementById('newDlUrls'),
    newDlFilename: document.getElementById('newDlFilename'),
    btnStartNewDl: document.getElementById('btnStartNewDl'),

    downloadsList: document.getElementById('downloadsList'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    popupFooter: document.getElementById('popupFooter'),
    btnShowAllHistory: document.getElementById('btnShowAllHistory'),

    globalMenu: document.getElementById('globalMenu'),
    itemMenu: document.getElementById('itemMenu'),

    deleteDialog: document.getElementById('deleteDialog'),
    deleteDialogDesc: document.getElementById('deleteDialogDesc'),
    btnCancelDelete: document.getElementById('btnCancelDelete'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),

    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    chkHideNative: document.getElementById('chkHideNative'),
    chkShowBadge: document.getElementById('chkShowBadge'),
    chkNotify: document.getElementById('chkNotify'),
    selTheme: document.getElementById('selTheme'),
    btnOpenShortcuts: document.getElementById('btnOpenShortcuts'),

    toast: document.getElementById('toast')
  };

  if (isTabMode) {
    el.popupHeader.classList.add('hidden');
    el.popupFooter.classList.add('hidden');
    el.tabHeader.classList.remove('hidden');
    el.filterSection.classList.remove('hidden');
  }

  // Runtime State
  let settings = { ...DEFAULT_SETTINGS };
  let allItems = [];
  let itemsById = new Map();
  let currentCategory = 'all';
  let searchQuery = '';
  let menuTargetId = null;
  let pendingDeleteId = null;
  let refreshSeq = 0;
  let lastRenderedOrderKey = '';
  let fallbackPollTimer = null;
  let toastTimer = null;

  // Caches
  const cardDomMap = new Map();             // id -> HTMLElement
  const cardSigMap = new Map();             // id -> signature
  const dateHeaderMap = new Map();          // `${idx}:${label}` -> HTMLElement
  const iconCache = new Map();              // id -> dataUrl
  const lastIconFilenameMap = new Map();    // id -> filename
  const completedIconRefreshed = new Set(); // Set<id>
  const localSpeedSamples = new Map();      // id -> Array<{ t, b }>
  const currentSpeeds = new Map();          // id -> bytes/sec

  // Helpers
  function getDangerStatus(item) {
    if (!item) return 'safe';
    if (item.dangerStatus) return item.dangerStatus;
    const isBlockedErr = item.state === 'interrupted' && item.error && BLOCKED_DANGER_ERRORS.has(item.error);
    const isInProgressDanger = item.state === 'in_progress' && item.danger && !SAFE_DANGER_TYPES.has(item.danger);
    if (!isInProgressDanger && !isBlockedErr) return 'safe';
    if (WAITING_DANGER_TYPES.has(item.danger)) return 'scanning';
    if (BLOCKED_DANGER_TYPES.has(item.danger) || isBlockedErr) return 'blocked';
    return 'action_required';
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const idx = Math.max(0, Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024))));
    const val = bytes / Math.pow(1024, idx);
    const numStr = val >= 100 || idx === 0
      ? String(Math.round(val))
      : val.toFixed(1).replace('.', ',');
    return `${numStr} ${units[idx]}`;
  }

  function canRetryItem(item) {
    if (!item) return false;
    if (item.canResume) return true;
    const u = item.url || item.finalUrl || '';
    return /^https?:|^ftp:/i.test(u);
  }

  function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec < 1) return '';
    return `${formatBytes(bytesPerSec)}/sn`;
  }

  function formatChromeEta(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400 * 7) return '';
    const s = Math.ceil(seconds);
    if (s < 60) return `${s} sn kaldı`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} dk kaldı`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return remM > 0 ? `${h} sa ${remM} dk kaldı` : `${h} sa kaldı`;
  }

  function getDateGroupLabel(isoStr) {
    if (!isoStr) return 'Daha eski';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return 'Daha eski';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const itemStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((todayStart - itemStart) / 86400000);

    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function getFileName(item) {
    if (item.filename) {
      const parts = item.filename.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1] || 'İndirilen dosya';
    }
    if (item.basename) return item.basename;
    const rawUrl = item.finalUrl || item.url || '';
    const clean = rawUrl.split('?')[0].split('#')[0];
    const segs = clean.split('/');
    const candidate = segs[segs.length - 1];
    if (candidate) {
      try {
        return decodeURIComponent(candidate);
      } catch {
        return candidate;
      }
    }
    return 'İndiriliyor…';
  }

  function getExtension(item) {
    const name = getFileName(item);
    const dot = name.lastIndexOf('.');
    if (dot <= 0 || dot === name.length - 1) return '';
    const ext = name.slice(dot + 1).toLowerCase();
    if (ext === 'crdownload' || ext === 'part' || ext === 'tmp') {
      const base = name.slice(0, dot);
      const prevDot = base.lastIndexOf('.');
      if (prevDot > 0) return base.slice(prevDot + 1).toLowerCase();
    }
    return ext.slice(0, 5);
  }

  function getCategory(item) {
    const ext = getExtension(item);
    if (!ext) return 'other';
    for (const [cat, set] of Object.entries(CATEGORY_EXTS)) {
      if (set.has(ext)) return cat;
    }
    return 'other';
  }

  function getHostOnly(urlStr) {
    if (!urlStr) return '';
    if (urlStr.startsWith('blob:')) return 'tarayıcı verisi';
    if (urlStr.startsWith('data:')) return 'veri adresi';
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isFileMissingError(msg) {
    return /does(?:\s+not|n't)\s+exist|not\s+found|no\s+such\s+file|file\s+missing|already\s+(?:deleted|removed)|has\s+been\s+(?:deleted|removed)/i.test(msg || '');
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.add('hidden');
    }, 2200);
  }

  async function copyToClipboard(text, msg, flashBtn = null) {
    if (!text) {
      showToast('Kopyalanacak bağlantı yok');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(msg);

    if (flashBtn && flashBtn.classList.contains('cr-icon-btn')) {
      const orig = flashBtn.dataset.origHtml || flashBtn.innerHTML;
      flashBtn.dataset.origHtml = orig;
      flashBtn.classList.add('copied-flash');
      flashBtn.innerHTML = ICONS.check;
      setTimeout(() => {
        flashBtn.classList.remove('copied-flash');
        flashBtn.innerHTML = orig;
      }, 1200);
    }
  }

  // Theme & Settings
  function applyTheme(themePref) {
    const sysLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const resolved = themePref === 'system' ? (sysLight ? 'light' : 'dark') : themePref;
    document.documentElement.dataset.theme = resolved;
    return resolved === 'light';
  }

  async function loadSettings() {
    try {
      const res = await chrome.storage.local.get('settings');
      settings = { ...DEFAULT_SETTINGS, ...(res.settings || {}) };
    } catch {
      settings = { ...DEFAULT_SETTINGS };
    }
    el.chkHideNative.checked = Boolean(settings.hideNativeBubble);
    el.chkShowBadge.checked = Boolean(settings.showBadge);
    el.chkNotify.checked = Boolean(settings.notifyOnComplete);
    el.selTheme.value = settings.theme || 'system';

    const isLight = applyTheme(settings.theme);
    if (settings.resolvedLight !== isLight) {
      settings.resolvedLight = isLight;
      chrome.storage.local.set({ settings }).catch(() => {});
    }
  }

  async function saveSettings(partial) {
    settings = { ...settings, ...partial };
    settings.resolvedLight = applyTheme(settings.theme);
    await chrome.storage.local.set({ settings });
  }

  // Speed Sampling
  function updateItemSpeed(item) {
    if (item.state !== 'in_progress' || item.paused) {
      localSpeedSamples.delete(item.id);
      currentSpeeds.set(item.id, 0);
      return;
    }

    if (typeof item.speed === 'number' && item.speed > 0 && !currentSpeeds.get(item.id)) {
      currentSpeeds.set(item.id, item.speed);
    }

    const now = Date.now();
    let samples = localSpeedSamples.get(item.id);
    if (!samples) {
      samples = [];
      localSpeedSamples.set(item.id, samples);
    }
    samples.push({ t: now, b: item.bytesReceived || 0 });
    const cutoff = now - 3200;
    while (samples.length > 2 && samples[0].t < cutoff) {
      samples.shift();
    }
    if (samples.length >= 2) {
      const dt = (samples[samples.length - 1].t - samples[0].t) / 1000;
      if (dt > 0.12) {
        const deltaB = samples[samples.length - 1].b - samples[0].b;
        if (deltaB >= 0) {
          currentSpeeds.set(item.id, deltaB / dt);
        }
      }
    }
  }

  function sortItemsList(list) {
    list.sort((a, b) => {
      const aAct = a.state === 'in_progress' ? 1 : 0;
      const bAct = b.state === 'in_progress' ? 1 : 0;
      if (aAct !== bAct) return bAct - aAct;
      const tDiff = (Date.parse(b.startTime) || 0) - (Date.parse(a.startTime) || 0);
      if (tDiff !== 0) return tDiff;
      return (b.id || 0) - (a.id || 0);
    });
  }

  function prepareItem(raw) {
    const item = { ...raw };
    item.exists = typeof item.exists === 'boolean' ? item.exists : true;
    item.paused = Boolean(item.paused);
    item.canResume = Boolean(item.canResume);
    item.error = item.error || null;
    item.dangerStatus = getDangerStatus(item);
    return item;
  }

  // Filtering
  function matchesFilter(item) {
    if (!item) return false;

    if (currentCategory === 'active') {
      if (item.state !== 'in_progress') return false;
    } else if (currentCategory && currentCategory !== 'all') {
      if (getCategory(item) !== currentCategory) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = getFileName(item).toLowerCase();
      const url = (item.finalUrl || item.url || '').toLowerCase();
      const ref = (item.referrer || '').toLowerCase();
      if (!name.includes(q) && !url.includes(q) && !ref.includes(q)) return false;
    }

    return true;
  }

  // File Icon Loader & Completion Refresh (from xinghaix downloadFileIcon.js)
  function ensureCardIcon(item, iconColEl) {
    const prevFilename = lastIconFilenameMap.get(item.id) || '';
    const curFilename = item.filename || '';
    const filenameChanged = Boolean(curFilename && curFilename !== prevFilename);
    if (curFilename) {
      lastIconFilenameMap.set(item.id, curFilename);
    }

    let forceRefresh = filenameChanged;
    if (item.state === 'complete' && !completedIconRefreshed.has(item.id)) {
      completedIconRefreshed.add(item.id);
      forceRefresh = true;
    }

    if (!forceRefresh && iconCache.has(item.id)) {
      const cached = iconCache.get(item.id);
      const existingImg = iconColEl.querySelector('img');
      if (!existingImg || existingImg.src !== cached) {
        iconColEl.innerHTML = `<img src="${cached}" alt="" draggable="false" />`;
      }
      return;
    }

    if (!iconColEl.querySelector('img')) {
      const ext = getExtension(item) || '•••';
      iconColEl.innerHTML = `<span class="dl-ext-badge">${escapeHtml(ext.slice(0, 4))}</span>`;
    }

    if (!curFilename || !chrome.downloads || typeof chrome.downloads.getFileIcon !== 'function') {
      return;
    }

    chrome.downloads.getFileIcon(item.id, { size: 32 }, (iconUrl) => {
      if (chrome.runtime.lastError || !iconUrl) return;
      iconCache.set(item.id, iconUrl);
      if (iconColEl.isConnected) {
        iconColEl.innerHTML = `<img src="${iconUrl}" alt="" draggable="false" />`;
      }
    });
  }

  // Card Rendering
  function getCardSignature(item) {
    return [
      item.state,
      Boolean(item.paused),
      Boolean(item.canResume),
      getDangerStatus(item),
      item.exists !== false ? '1' : '0',
      item.referrer ? 'ref' : 'noref'
    ].join('|');
  }

  function buildQuickButtonsHtml(item) {
    const dangerStatus = getDangerStatus(item);
    const isInProgress = item.state === 'in_progress';
    const isComplete = item.state === 'complete';
    const exists = item.exists !== false;

    const btns = [];

    // Always 1-click Copy Download Link
    btns.push(
      `<button class="cr-icon-btn" data-act="copy-url" title="İndirme bağlantısını kopyala">${ICONS.link}</button>`
    );

    if (dangerStatus === 'action_required') {
      if (!isTabMode) {
        btns.push(
          `<button class="cr-tonal-btn compact" data-act="accept-danger" title="Dosyayı tut">Tut</button>`,
          `<button class="cr-icon-btn" data-act="cancel" title="Sil">${ICONS.close}</button>`
        );
      } else {
        btns.push(
          `<button class="cr-icon-btn" data-act="item-menu" title="Diğer işlemler">${ICONS.more}</button>`
        );
      }
      return btns.join('');
    }

    if (isInProgress) {
      if (!isTabMode) {
        if (item.paused) {
          btns.push(`<button class="cr-icon-btn" data-act="resume" title="Devam et">${ICONS.play}</button>`);
        } else {
          btns.push(`<button class="cr-icon-btn" data-act="pause" title="Duraklat">${ICONS.pause}</button>`);
        }
        btns.push(`<button class="cr-icon-btn" data-act="cancel" title="İptal">${ICONS.close}</button>`);
      } else {
        btns.push(`<button class="cr-icon-btn" data-act="item-menu" title="Diğer işlemler">${ICONS.more}</button>`);
      }
      return btns.join('');
    }

    if (isComplete && exists) {
      btns.push(
        `<button class="cr-icon-btn" data-act="show-folder" title="Klasörde göster">${ICONS.folder}</button>`
      );
    } else if (dangerStatus !== 'blocked' && canRetryItem(item)) {
      btns.push(
        `<button class="cr-icon-btn" data-act="retry" title="Tekrar indir">${ICONS.retry}</button>`
      );
    }

    btns.push(
      `<button class="cr-icon-btn" data-act="item-menu" title="Diğer işlemler">${ICONS.more}</button>`
    );

    if (isTabMode) {
      btns.push(
        `<button class="cr-icon-btn" data-act="erase" title="Listeden kaldır">${ICONS.close}</button>`
      );
    }

    return btns.join('');
  }

  function buildTabPillsHtml(item) {
    if (!isTabMode) return '';
    const dangerStatus = getDangerStatus(item);
    if (dangerStatus === 'action_required') {
      return `
        <button class="cr-tonal-btn compact" data-act="accept-danger">Tehlikeli dosyayı tut</button>
        <button class="cr-outline-btn compact" data-act="cancel">Sil</button>
      `;
    }
    if (item.state === 'in_progress') {
      const pauseResumeBtn = item.paused
        ? `<button class="cr-tonal-btn compact" data-act="resume">Devam et</button>`
        : `<button class="cr-outline-btn compact" data-act="pause">Duraklat</button>`;
      return `${pauseResumeBtn}<button class="cr-outline-btn compact" data-act="cancel">İptal</button>`;
    }
    if (item.state === 'interrupted' && dangerStatus !== 'blocked' && canRetryItem(item)) {
      return `<button class="cr-tonal-btn compact" data-act="retry">Tekrar indir</button>`;
    }
    return '';
  }

  function buildStatusSubline(item) {
    const dangerStatus = getDangerStatus(item);
    const isInProgress = item.state === 'in_progress';
    const isComplete = item.state === 'complete';
    const isInterrupted = item.state === 'interrupted';
    const exists = item.exists !== false;

    const rawUrl = item.finalUrl || item.url || '';
    const domain = getHostOnly(rawUrl);
    const domainSpan = domain
      ? `<span class="dl-domain-inline" data-act="copy-url" title="Bağlantıyı kopyalamak için tıkla:\n${escapeHtml(rawUrl)}">${escapeHtml(domain)}</span>`
      : '';

    if (dangerStatus === 'scanning') {
      return 'Güvenlik taraması yapılıyor…';
    }
    if (dangerStatus === 'action_required') {
      return 'Doğrulanmamış veya tehlikeli olabilecek dosya';
    }
    if (dangerStatus === 'blocked') {
      return 'Güvenlik nedeniyle engellendi';
    }

    if (isInProgress) {
      const spd = currentSpeeds.get(item.id) || item.speed || 0;
      const spdStr = !item.paused && spd > 0 ? `${formatSpeed(spd)} - ` : '';
      const recStr = formatBytes(item.bytesReceived || 0);

      if (item.totalBytes > 0) {
        const totStr = formatBytes(item.totalBytes);
        if (item.paused) {
          return `${recStr} / ${totStr}, Duraklatıldı`;
        }
        if (item.bytesReceived >= item.totalBytes) {
          return `${totStr} • Doğrulanıyor…`;
        }
        let etaSec = 0;
        if (spd > 0) {
          etaSec = (item.totalBytes - item.bytesReceived) / spd;
        } else if (item.estimatedEndTime) {
          etaSec = (Date.parse(item.estimatedEndTime) - Date.now()) / 1000;
        }
        const etaStr = formatChromeEta(etaSec);
        return etaStr ? `${spdStr}${recStr} / ${totStr}, ${etaStr}` : `${spdStr}${recStr} / ${totStr}`;
      }
      return item.paused ? `${recStr}, Duraklatıldı` : `${spdStr}${recStr}`;
    }

    if (isComplete) {
      const sz = item.fileSize > 0 ? item.fileSize : (item.totalBytes > 0 ? item.totalBytes : item.bytesReceived);
      const sizeStr = sz > 0 ? formatBytes(sz) : '';
      if (!exists) {
        return !isTabMode && domainSpan ? `Silindi • ${domainSpan}` : 'Silindi';
      }
      if (!isTabMode) {
        if (sizeStr && domainSpan) return `${sizeStr} • ${domainSpan}`;
        return sizeStr || domainSpan || 'Tamamlandı';
      }
      return sizeStr;
    }

    if (isInterrupted) {
      const errText = ERROR_LABELS[item.error] || 'Başarısız';
      return !isTabMode && domainSpan ? `${escapeHtml(errText)} • ${domainSpan}` : escapeHtml(errText);
    }

    return '';
  }

  function updateCardDynamicContent(card, item) {
    const sig = getCardSignature(item);
    const prevSig = cardSigMap.get(item.id);

    const isInProgress = item.state === 'in_progress';
    const isComplete = item.state === 'complete';
    const exists = item.exists !== false;

    const fileName = getFileName(item);
    const nameEl = card.querySelector('.dl-name');
    if (nameEl.textContent !== fileName) {
      nameEl.textContent = fileName;
    }
    nameEl.classList.toggle('can-open', isComplete && exists);
    nameEl.classList.toggle('is-deleted', isComplete && !exists);
    nameEl.title = item.filename || fileName;

    if (isTabMode) {
      const rawUrl = item.finalUrl || item.url || '';
      const rawUrlEl = card.querySelector('.dl-raw-url');
      if (rawUrlEl.textContent !== rawUrl) {
        rawUrlEl.textContent = rawUrl;
      }
      rawUrlEl.title = `İndirme bağlantısını kopyalamak için tıkla:\n${rawUrl}`;

      const refEl = card.querySelector('.dl-ref-tag');
      if (item.referrer) {
        const refHost = getHostOnly(item.referrer) || 'kaynak';
        const txt = `← ${refHost}`;
        if (refEl.textContent !== txt) refEl.textContent = txt;
        refEl.title = `Kaynak sayfa: ${item.referrer}\n• Tıkla: Kaynak bağlantısını kopyala\n• Shift+Tıkla: Sayfayı aç`;
        refEl.classList.remove('hidden');
      } else {
        refEl.classList.add('hidden');
      }
    }

    const sublineEl = card.querySelector('.dl-subline');
    const subHtml = buildStatusSubline(item);
    if (sublineEl.innerHTML !== subHtml) {
      sublineEl.innerHTML = subHtml;
    }

    const progWrap = card.querySelector('.cr-progress');
    const progBar = card.querySelector('.cr-progress-bar');
    if (isInProgress) {
      progWrap.classList.remove('hidden');
      if (item.totalBytes > 0) {
        const pct = Math.min(100, Math.max(0, (item.bytesReceived / item.totalBytes) * 100));
        progBar.classList.remove('indeterminate');
        progBar.style.width = `${pct.toFixed(1)}%`;
      } else {
        progBar.classList.add('indeterminate');
      }
      progBar.classList.toggle('paused', Boolean(item.paused));
    } else {
      progWrap.classList.add('hidden');
    }

    ensureCardIcon(item, card.querySelector('.dl-icon-col'));

    if (sig !== prevSig) {
      cardSigMap.set(item.id, sig);
      card.querySelector('.dl-quick-btns').innerHTML = buildQuickButtonsHtml(item);
      card.querySelector('.dl-tab-pills').innerHTML = buildTabPillsHtml(item);
    }
  }

  function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'dl-item';
    card.dataset.id = String(item.id);
    card.innerHTML = `
      <div class="dl-icon-col"></div>
      <div class="dl-content-col">
        <div class="dl-name" data-act="open-file"></div>
        <div class="dl-url-row-tab">
          <span class="dl-raw-url" data-act="copy-url"></span>
          <span class="dl-ref-tag hidden" data-act="ref-click"></span>
        </div>
        <div class="dl-subline"></div>
        <div class="cr-progress hidden">
          <div class="cr-progress-bar"></div>
        </div>
        <div class="dl-tab-pills"></div>
      </div>
      <div class="dl-quick-btns"></div>
    `;
    updateCardDynamicContent(card, item);
    return card;
  }

  function updateHeaderLiveSubtitle() {
    if (isTabMode) return;
    let activeCount = 0;
    let totalSpeed = 0;
    for (const item of allItems) {
      if (item.state === 'in_progress') {
        activeCount++;
        if (!item.paused) {
          totalSpeed += currentSpeeds.get(item.id) || item.speed || 0;
        }
      }
    }
    if (activeCount > 0) {
      const spdStr = totalSpeed > 0 ? ` • ${formatSpeed(totalSpeed)}` : '';
      el.bubbleLiveSub.textContent = `${activeCount} indirme devam ediyor${spdStr}`;
      el.bubbleLiveSub.classList.remove('hidden');
    } else {
      el.bubbleLiveSub.classList.add('hidden');
    }
  }

  function renderList(forceReplace = false) {
    updateHeaderLiveSubtitle();

    const matched = allItems.filter(matchesFilter);
    const visibleItems = isTabMode ? matched : matched.slice(0, 120);

    if (visibleItems.length === 0) {
      lastRenderedOrderKey = 'EMPTY';
      el.downloadsList.replaceChildren();
      el.downloadsList.classList.add('hidden');
      el.emptyState.classList.remove('hidden');
      el.emptyTitle.textContent = (searchQuery || currentCategory !== 'all')
        ? 'Arama sonucu bulunamadı'
        : 'İndirdiğiniz dosyalar burada görünür';
      return;
    }

    el.emptyState.classList.add('hidden');
    el.downloadsList.classList.remove('hidden');

    const desiredNodes = [];
    const orderTokens = [];
    let lastDateLabel = null;
    let groupIndex = 0;

    for (const item of visibleItems) {
      try {
        if (isTabMode) {
          const groupLabel = item.state === 'in_progress'
            ? 'Devam edenler'
            : getDateGroupLabel(item.startTime);
          if (groupLabel !== lastDateLabel) {
            lastDateLabel = groupLabel;
            groupIndex++;
            const hdrKey = `${groupIndex}:${groupLabel}`;
            let hdr = dateHeaderMap.get(hdrKey);
            if (!hdr) {
              hdr = document.createElement('div');
              hdr.className = 'cr-date-header';
              hdr.textContent = groupLabel;
              dateHeaderMap.set(hdrKey, hdr);
            }
            desiredNodes.push(hdr);
            orderTokens.push(`H:${hdrKey}`);
          }
        }

        let card = cardDomMap.get(item.id);
        if (!card) {
          card = createCardElement(item);
          cardDomMap.set(item.id, card);
        } else {
          updateCardDynamicContent(card, item);
        }
        desiredNodes.push(card);
        orderTokens.push(String(item.id));
      } catch (err) {
        console.error('İndirme kartı oluşturulamadı:', item && item.id, err);
      }
    }

    const nextOrderKey = `${currentCategory}|${orderTokens.join(',')}`;
    if (forceReplace || nextOrderKey !== lastRenderedOrderKey || el.downloadsList.childElementCount !== desiredNodes.length) {
      lastRenderedOrderKey = nextOrderKey;
      el.downloadsList.replaceChildren(...desiredNodes);
    }
  }

  // Snapshot Fetching (Backend RPC + Direct API fallback)
  async function requestSnapshotFromBackend() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SNAPSHOT' });
      if (response && response.ok && Array.isArray(response.items)) {
        return response.items;
      }
    } catch {
      // Fallback to direct chrome.downloads.search below
    }
    const direct = await chrome.downloads.search({ orderBy: ['-startTime'] });
    return direct || [];
  }

  async function refreshDownloads(forceReplace = false) {
    const reqId = ++refreshSeq;
    const rawList = await requestSnapshotFromBackend();
    if (reqId !== refreshSeq) return;

    const prepared = rawList.filter(Boolean).map(prepareItem);
    sortItemsList(prepared);

    allItems = prepared;
    itemsById = new Map(prepared.map((i) => [i.id, i]));

    let hasActive = false;
    for (const item of prepared) {
      if (item.state === 'in_progress') {
        hasActive = true;
        updateItemSpeed(item);
      }
    }

    renderList(forceReplace);
    syncFallbackPolling(hasActive);
  }

  function applySessionProjection(projection) {
    if (!projection || typeof projection !== 'object') return;

    let mutatedList = false;
    const removedIds = Array.isArray(projection.removedIds) ? projection.removedIds : [];
    if (removedIds.length > 0) {
      const remSet = new Set(removedIds);
      const prevLen = allItems.length;
      allItems = allItems.filter((i) => !remSet.has(i.id));
      for (const id of removedIds) {
        itemsById.delete(id);
        cleanupCardCache(id);
      }
      if (allItems.length !== prevLen) mutatedList = true;
    }

    const activeById = projection.activeById || {};
    for (const rawActive of Object.values(activeById)) {
      if (!rawActive || typeof rawActive.id !== 'number') continue;
      const item = prepareItem(rawActive);
      if (typeof item.speed === 'number' && item.speed >= 0) {
        currentSpeeds.set(item.id, item.speed);
      }
      updateItemSpeed(item);

      const existing = itemsById.get(item.id);
      if (existing) {
        if (existing.state === 'complete' || existing.state === 'interrupted') {
          continue;
        }
        Object.assign(existing, item);
      } else {
        allItems.unshift(item);
        itemsById.set(item.id, item);
        mutatedList = true;
      }
    }

    if (mutatedList) sortItemsList(allItems);
    const anyStillActive = allItems.some((i) => i.state === 'in_progress');
    syncFallbackPolling(anyStillActive);
    renderList(false);
  }

  function syncFallbackPolling(hasActive) {
    if (hasActive && !fallbackPollTimer) {
      fallbackPollTimer = setInterval(() => {
        refreshDownloads(false).catch(() => {});
      }, 650);
    } else if (!hasActive && fallbackPollTimer) {
      clearInterval(fallbackPollTimer);
      fallbackPollTimer = null;
    }
  }

  function cleanupCardCache(id) {
    const node = cardDomMap.get(id);
    if (node) node.remove();
    cardDomMap.delete(id);
    cardSigMap.delete(id);
    iconCache.delete(id);
    lastIconFilenameMap.delete(id);
    completedIconRefreshed.delete(id);
    localSpeedSamples.delete(id);
    currentSpeeds.delete(id);
  }

  // Smart Chrome Action Menu Positioning (flips upward when near bottom edge!)
  function closeAllMenus() {
    el.globalMenu.classList.add('hidden');
    el.itemMenu.classList.add('hidden');
  }

  function openMenuAt(menuEl, x, y) {
    closeAllMenus();
    menuEl.style.left = '0px';
    menuEl.style.top = '0px';
    menuEl.classList.remove('hidden');

    const rect = menuEl.getBoundingClientRect();
    const maxX = Math.max(8, window.innerWidth - rect.width - 8);
    const maxY = Math.max(8, window.innerHeight - rect.height - 8);

    const finalX = Math.max(8, Math.min(x, maxX));
    const finalY = y + rect.height > window.innerHeight - 8
      ? Math.max(8, y - rect.height)
      : Math.max(8, Math.min(y, maxY));

    menuEl.style.left = `${finalX}px`;
    menuEl.style.top = `${finalY}px`;
  }

  function openMenuAnchoredTo(menuEl, anchorBtn) {
    closeAllMenus();
    menuEl.style.left = '0px';
    menuEl.style.top = '0px';
    menuEl.classList.remove('hidden');

    const btnRect = anchorBtn.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();

    const preferredX = btnRect.right - menuRect.width;
    const maxX = Math.max(8, window.innerWidth - menuRect.width - 8);
    const finalX = Math.max(8, Math.min(preferredX, maxX));

    const belowY = btnRect.bottom + 4;
    const aboveY = btnRect.top - menuRect.height - 4;
    const finalY = (belowY + menuRect.height <= window.innerHeight - 8 || aboveY < 8)
      ? Math.min(belowY, Math.max(8, window.innerHeight - menuRect.height - 8))
      : aboveY;

    menuEl.style.left = `${finalX}px`;
    menuEl.style.top = `${finalY}px`;
  }

  function configureAndShowItemMenu(id, x, y, anchorEl = null) {
    const item = itemsById.get(id);
    if (!item) return;
    menuTargetId = id;

    const isCompleteExists = item.state === 'complete' && item.exists !== false;
    const canFolder = (item.state === 'complete' || item.state === 'in_progress') && item.exists !== false;

    el.itemMenu.querySelector('[data-iact="open-file"]').disabled = !isCompleteExists;
    el.itemMenu.querySelector('[data-iact="show-folder"]').disabled = !canFolder;
    el.itemMenu.querySelector('[data-iact="copy-referrer"]').disabled = !item.referrer;
    el.itemMenu.querySelector('[data-iact="open-referrer"]').disabled = !item.referrer;
    el.itemMenu.querySelector('[data-iact="copy-path"]').disabled = !item.filename;
    el.itemMenu.querySelector('[data-iact="retry"]').disabled = !canRetryItem(item);
    el.itemMenu.querySelector('[data-iact="delete-disk"]').disabled = !isCompleteExists;

    if (anchorEl) {
      openMenuAnchoredTo(el.itemMenu, anchorEl);
    } else {
      openMenuAt(el.itemMenu, x, y);
    }
  }

  // Item Actions (with xinghaix edge-case handling)
  async function executeItemAction(action, id, event = null, triggerEl = null) {
    const item = itemsById.get(id);
    if (!item) return;

    switch (action) {
      case 'open-file': {
        if (item.state === 'complete' && item.exists !== false) {
          try {
            const p = chrome.downloads.open(id);
            if (p && typeof p.catch === 'function') p.catch(() => refreshDownloads());
          } catch {
            refreshDownloads();
          }
        }
        break;
      }
      case 'show-folder': {
        if ((item.state === 'complete' || item.state === 'in_progress') && item.exists !== false) {
          try {
            const p = chrome.downloads.show(id);
            if (p && typeof p.catch === 'function') p.catch(() => refreshDownloads());
          } catch {
            refreshDownloads();
          }
        }
        break;
      }
      case 'copy-url': {
        const url = item.finalUrl || item.url;
        await copyToClipboard(url, 'İndirme bağlantısı kopyalandı', triggerEl);
        break;
      }
      case 'ref-click': {
        if (!item.referrer) break;
        if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
          chrome.tabs.create({ url: item.referrer });
        } else {
          await copyToClipboard(item.referrer, 'Kaynak sayfa bağlantısı kopyalandı');
        }
        break;
      }
      case 'copy-referrer': {
        await copyToClipboard(item.referrer, 'Kaynak sayfa bağlantısı kopyalandı');
        break;
      }
      case 'open-referrer': {
        if (item.referrer) chrome.tabs.create({ url: item.referrer });
        break;
      }
      case 'copy-path': {
        await copyToClipboard(item.filename || getFileName(item), 'Dosya yolu kopyalandı');
        break;
      }
      case 'pause': {
        chrome.downloads.pause(id, () => {
          void chrome.runtime.lastError;
          refreshDownloads();
        });
        break;
      }
      case 'resume': {
        chrome.downloads.resume(id, () => {
          void chrome.runtime.lastError;
          refreshDownloads();
        });
        break;
      }
      case 'cancel': {
        if (item.state === 'in_progress') {
          chrome.downloads.cancel(id, () => {
            void chrome.runtime.lastError;
            refreshDownloads();
          });
        } else {
          await eraseDownloadById(id);
        }
        break;
      }
      case 'accept-danger': {
        if (getDangerStatus(item) !== 'action_required') break;
        try {
          await chrome.downloads.acceptDanger(id);
          await refreshDownloads();
        } catch {
          await refreshDownloads();
        }
        break;
      }
      case 'retry': {
        if (item.canResume) {
          chrome.downloads.resume(id, () => {
            void chrome.runtime.lastError;
            refreshDownloads();
          });
          break;
        }
        const retryUrl = item.url || item.finalUrl;
        if (!retryUrl || retryUrl.startsWith('blob:')) {
          showToast('Geçici bağlantı tekrar indirilemez');
          break;
        }
        try {
          await chrome.downloads.download({ url: retryUrl });
          if (item.state === 'interrupted' || item.exists === false) {
            await eraseDownloadById(id, false);
          }
          showToast('İndirme yeniden başlatıldı');
          await refreshDownloads();
          setTimeout(() => refreshDownloads(), 500);
        } catch {
          showToast('İndirme başlatılamadı');
        }
        break;
      }
      case 'erase': {
        await eraseDownloadById(id);
        break;
      }
      case 'delete-disk': {
        if (event && event.shiftKey) {
          await confirmDiskDelete(id);
        } else {
          pendingDeleteId = id;
          el.deleteDialogDesc.textContent = `"${getFileName(item)}" bilgisayarınızdan kalıcı olarak silinecek.`;
          el.deleteDialog.classList.remove('hidden');
        }
        break;
      }
      case 'item-menu': {
        if (triggerEl) configureAndShowItemMenu(id, 0, 0, triggerEl);
        break;
      }
    }
  }

  function eraseDownloadById(id, triggerRefresh = true) {
    return new Promise((resolve) => {
      chrome.downloads.erase({ id }, () => {
        void chrome.runtime.lastError;
        cleanupCardCache(id);
        allItems = allItems.filter((i) => i.id !== id);
        itemsById.delete(id);
        if (triggerRefresh) renderList(true);
        resolve();
      });
    });
  }

  // Smart disk removal (from xinghaix removeFileFromDisk)
  async function confirmDiskDelete(id) {
    const item = itemsById.get(id);
    if (!item) return;

    if (item.exists === false) {
      await eraseDownloadById(id);
      return;
    }

    const removeResult = await new Promise((resolve) => {
      chrome.downloads.removeFile(id, () => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, msg: chrome.runtime.lastError.message || '' });
          return;
        }
        resolve({ ok: true, msg: '' });
      });
    });

    if (!removeResult.ok && !isFileMissingError(removeResult.msg)) {
      const check = await chrome.downloads.search({ id }).catch(() => []);
      if (check && check[0] && check[0].exists !== false) {
        showToast('Dosya silinemedi (kullanımda olabilir)');
        await refreshDownloads();
        return;
      }
    }

    await eraseDownloadById(id);
    showToast('Dosya diskten silindi');
  }

  // Event Listeners
  el.downloadsList.addEventListener('click', (e) => {
    const actNode = e.target.closest('[data-act]');
    if (!actNode) return;
    e.stopPropagation();
    const card = actNode.closest('.dl-item');
    if (!card) return;
    executeItemAction(actNode.dataset.act, Number(card.dataset.id), e, actNode);
  });

  el.downloadsList.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.dl-item');
    if (!card) return;
    e.preventDefault();
    configureAndShowItemMenu(Number(card.dataset.id), e.clientX, e.clientY);
  });

  el.itemMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-iact]');
    if (!btn || btn.disabled || menuTargetId === null) return;
    const act = btn.dataset.iact;
    const id = menuTargetId;
    closeAllMenus();
    executeItemAction(act, id, e);
  });

  el.btnTogglePopupSearch.addEventListener('click', () => {
    const hiddenNow = el.filterSection.classList.toggle('hidden');
    el.btnTogglePopupSearch.classList.toggle('active-toggle', !hiddenNow);
    if (!hiddenNow) {
      el.popupSearchInput.focus();
    }
  });

  function toggleNewDlDrawer() {
    const hiddenNow = el.newDownloadDrawer.classList.toggle('hidden');
    if (!hiddenNow) el.newDlUrls.focus();
  }

  el.btnPopupNewDl.addEventListener('click', toggleNewDlDrawer);
  el.btnTabNewDl.addEventListener('click', toggleNewDlDrawer);
  el.btnCloseNewDl.addEventListener('click', () => {
    el.newDownloadDrawer.classList.add('hidden');
  });

  async function startManualDownloads() {
    const lines = el.newDlUrls.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const customName = el.newDlFilename.value.trim().replace(/^[/\\]+/, '');
    let started = 0;

    for (const raw of lines) {
      const url = /^https?:|^ftp:/i.test(raw) ? raw : `https://${raw}`;
      const opts = { url };
      if (customName && lines.length === 1) opts.filename = customName;
      try {
        await chrome.downloads.download(opts);
        started++;
      } catch {
        // Invalid URL
      }
    }

    if (started > 0) {
      el.newDlUrls.value = '';
      el.newDlFilename.value = '';
      el.newDownloadDrawer.classList.add('hidden');
      showToast('İndirme başlatıldı');
      await refreshDownloads();
      setTimeout(() => refreshDownloads(), 450);
    } else {
      showToast('Geçersiz bağlantı adresi');
    }
  }

  el.btnStartNewDl.addEventListener('click', startManualDownloads);
  el.newDlUrls.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') startManualDownloads();
  });

  el.btnPopupMore.addEventListener('click', (e) => {
    e.stopPropagation();
    openMenuAnchoredTo(el.globalMenu, el.btnPopupMore);
  });

  el.btnTabMore.addEventListener('click', (e) => {
    e.stopPropagation();
    openMenuAnchoredTo(el.globalMenu, el.btnTabMore);
  });

  el.btnTabFolder.addEventListener('click', () => {
    chrome.downloads.showDefaultFolder();
  });

  el.btnPopupClose.addEventListener('click', () => {
    window.close();
  });

  el.btnShowAllHistory.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_FULL_TAB' }, () => {
      window.close();
    });
  });

  el.globalMenu.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-gact]');
    if (!btn) return;
    const cmd = btn.dataset.gact;
    closeAllMenus();

    if (cmd === 'open-folder') {
      chrome.downloads.showDefaultFolder();
      return;
    }
    if (cmd === 'open-settings') {
      el.settingsModal.classList.remove('hidden');
      return;
    }

    const targets = allItems.filter((item) => {
      if (!item || item.state === 'in_progress') return false;
      if (cmd === 'clean-all') return true;
      if (cmd === 'clean-completed') return item.state === 'complete';
      if (cmd === 'clean-missing') return item.exists === false;
      if (cmd === 'clean-failed') return Boolean(item.error) || item.state === 'interrupted';
      return false;
    });

    for (const t of targets) {
      await eraseDownloadById(t.id, false);
    }
    renderList(true);
    showToast(targets.length > 0 ? `${targets.length} öğe listeden temizlendi` : 'Temizlenecek öğe yok');
  });

  // Search & Category Chips
  function handleSearchChange(val) {
    searchQuery = val.trim();
    el.btnClearPopupSearch.classList.toggle('hidden', searchQuery.length === 0);
    el.btnClearTabSearch.classList.toggle('hidden', searchQuery.length === 0);
    renderList(true);
  }

  el.popupSearchInput.addEventListener('input', () => {
    handleSearchChange(el.popupSearchInput.value);
  });

  el.tabSearchInput.addEventListener('input', () => {
    handleSearchChange(el.tabSearchInput.value);
  });

  el.btnClearPopupSearch.addEventListener('click', () => {
    el.popupSearchInput.value = '';
    handleSearchChange('');
    el.popupSearchInput.focus();
  });

  el.btnClearTabSearch.addEventListener('click', () => {
    el.tabSearchInput.value = '';
    handleSearchChange('');
    el.tabSearchInput.focus();
  });

  el.categoryBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.cr-chip');
    if (!chip) return;
    currentCategory = chip.dataset.cat || 'all';
    for (const c of el.categoryBar.querySelectorAll('.cr-chip')) {
      c.classList.toggle('active', c === chip);
    }
    el.downloadsList.parentElement.scrollTop = 0;
    renderList(true);
  });

  // Dialogs
  el.btnCancelDelete.addEventListener('click', () => {
    pendingDeleteId = null;
    el.deleteDialog.classList.add('hidden');
  });

  el.btnConfirmDelete.addEventListener('click', async () => {
    const id = pendingDeleteId;
    pendingDeleteId = null;
    el.deleteDialog.classList.add('hidden');
    if (id !== null) await confirmDiskDelete(id);
  });

  el.deleteDialog.addEventListener('click', (e) => {
    if (e.target === el.deleteDialog) {
      pendingDeleteId = null;
      el.deleteDialog.classList.add('hidden');
    }
  });

  el.btnCloseSettings.addEventListener('click', () => {
    el.settingsModal.classList.add('hidden');
  });

  el.settingsModal.addEventListener('click', (e) => {
    if (e.target === el.settingsModal) {
      el.settingsModal.classList.add('hidden');
    }
  });

  el.chkHideNative.addEventListener('change', () => {
    saveSettings({ hideNativeBubble: el.chkHideNative.checked });
  });

  el.chkShowBadge.addEventListener('change', () => {
    saveSettings({ showBadge: el.chkShowBadge.checked });
  });

  el.chkNotify.addEventListener('change', () => {
    saveSettings({ notifyOnComplete: el.chkNotify.checked });
  });

  el.selTheme.addEventListener('change', () => {
    saveSettings({ theme: el.selTheme.value });
  });

  el.btnOpenShortcuts.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (settings.theme === 'system') {
      saveSettings({ theme: 'system' });
    }
  });

  // Global Dismiss & Keyboard Shortcuts
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.cr-menu')) {
      closeAllMenus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')) &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      if (isTabMode) {
        el.tabSearchInput.focus();
      } else {
        el.filterSection.classList.remove('hidden');
        el.btnTogglePopupSearch.classList.add('active-toggle');
        el.popupSearchInput.focus();
      }
    } else if (e.key === 'Escape') {
      closeAllMenus();
      el.settingsModal.classList.add('hidden');
      el.deleteDialog.classList.add('hidden');
      pendingDeleteId = null;
    }
  });

  // Live Listeners (Session Projection + Native Download Events)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'session' && changes[PROJECTION_KEY] && changes[PROJECTION_KEY].newValue) {
      applySessionProjection(changes[PROJECTION_KEY].newValue);
    }
  });

  chrome.downloads.onCreated.addListener(() => refreshDownloads(false));
  chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state || delta.filename || delta.exists || delta.danger || delta.paused || delta.error) {
      refreshDownloads(false);
    }
  });
  chrome.downloads.onErased.addListener((id) => {
    cleanupCardCache(id);
    allItems = allItems.filter((i) => i.id !== id);
    itemsById.delete(id);
    renderList(true);
  });

  // Boot
  (async function init() {
    await loadSettings();
    if (chrome.storage.session) {
      try {
        const sess = await chrome.storage.session.get(PROJECTION_KEY);
        if (sess && sess[PROJECTION_KEY]) {
          applySessionProjection(sess[PROJECTION_KEY]);
        }
      } catch {
        // Ignore
      }
    }
    await refreshDownloads(true);
  })();
})();
