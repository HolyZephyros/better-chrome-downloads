// İndirilenler - Backend Service Worker (xinghaix-style projection & reconcile architecture)

const DEFAULT_SETTINGS = {
  hideNativeBubble: true,
  showBadge: true,
  notifyOnComplete: false,
  theme: 'system',
  resolvedLight: false
};

const PROJECTION_KEY = 'downloads_projection';
const ACTIVE_RECONCILE_ALARM = 'active-downloads-reconcile';
const ACTIVE_POLL_MS = 500;
const UI_DISABLE_THROTTLE_MS = 5000;

// Chrome Safe Browsing / Enterprise danger states (from xinghaix downloadDanger.js)
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

// Runtime state
const speedSamples = new Map();   // id -> Array<{ t: number, b: number }>
const computedSpeeds = new Map(); // id -> bytesPerSec
const pendingRefreshIds = new Set();

let refreshQueueTimer = null;
let activePollTimer = null;
let activePollInFlight = false;
let clearCheckTimer = null;
let lastUiApplyAt = 0;
let lastIconKey = '';
let projectionSeq = 0;

function getDangerStatus(item) {
  if (!item) return 'safe';
  const isBlockedErr = item.state === 'interrupted' && item.error && BLOCKED_DANGER_ERRORS.has(item.error);
  const isInProgressDanger = item.state === 'in_progress' && item.danger && !SAFE_DANGER_TYPES.has(item.danger);
  if (!isInProgressDanger && !isBlockedErr) return 'safe';
  if (WAITING_DANGER_TYPES.has(item.danger)) return 'scanning';
  if (BLOCKED_DANGER_TYPES.has(item.danger) || isBlockedErr) return 'blocked';
  return 'action_required';
}

function extractBaseName(pathOrUrl) {
  if (!pathOrUrl) return 'İndirilen dosya';
  const cleaned = String(pathOrUrl).split('?')[0].split('#')[0];
  const parts = cleaned.replace(/\\/g, '/').split('/');
  const last = parts[parts.length - 1] || 'İndirilen dosya';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function normalizeDownloadItem(item) {
  if (!item) return null;
  const dangerStatus = getDangerStatus(item);
  return {
    id: item.id,
    state: item.state || 'in_progress',
    filename: item.filename || '',
    basename: extractBaseName(item.filename || item.finalUrl || item.url),
    url: item.url || '',
    finalUrl: item.finalUrl || item.url || '',
    referrer: item.referrer || '',
    bytesReceived: typeof item.bytesReceived === 'number' ? item.bytesReceived : 0,
    totalBytes: typeof item.totalBytes === 'number' ? item.totalBytes : 0,
    fileSize: typeof item.fileSize === 'number' ? item.fileSize : -1,
    estimatedEndTime: item.estimatedEndTime || null,
    startTime: item.startTime || '',
    endTime: item.endTime || null,
    paused: Boolean(item.paused),
    canResume: Boolean(item.canResume),
    exists: typeof item.exists === 'boolean' ? item.exists : true,
    error: item.error || null,
    danger: item.danger || 'safe',
    dangerStatus,
    speed: computedSpeeds.get(item.id) || 0
  };
}

async function getSettings() {
  try {
    const stored = await chrome.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function ensureNativeUiState(force = false) {
  const now = Date.now();
  if (!force && now - lastUiApplyAt < UI_DISABLE_THROTTLE_MS) return;
  lastUiApplyAt = now;

  const settings = await getSettings();
  const shouldEnableNative = !settings.hideNativeBubble;

  if (chrome.downloads && typeof chrome.downloads.setUiOptions === 'function') {
    try {
      await chrome.downloads.setUiOptions({ enabled: shouldEnableNative });
      return;
    } catch (err) {
      console.warn('setUiOptions hatası:', err);
    }
  }
}

async function setToolbarIconState(stateKey, isLight) {
  const key = `${stateKey}:${isLight ? 'light' : 'dark'}`;
  if (key === lastIconKey) return;
  lastIconKey = key;

  let path;
  if (stateKey === 'active') {
    path = {
      16: 'icons/toolbar_active16.png',
      24: 'icons/toolbar_active24.png',
      32: 'icons/toolbar_active32.png',
      48: 'icons/toolbar_active48.png'
    };
  } else if (isLight) {
    path = {
      16: 'icons/toolbar_light16.png',
      24: 'icons/toolbar_light24.png',
      32: 'icons/toolbar_light32.png',
      48: 'icons/toolbar_light48.png'
    };
  } else {
    path = {
      16: 'icons/toolbar_dark16.png',
      24: 'icons/toolbar_dark24.png',
      32: 'icons/toolbar_dark32.png',
      48: 'icons/toolbar_dark48.png'
    };
  }

  try {
    await chrome.action.setIcon({ path });
  } catch {
    // Ignore transient icon error
  }
}

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: 'quick-download-media',
      title: 'Bağlantıyı indir',
      contexts: ['link', 'image', 'video', 'audio']
    }, () => void chrome.runtime.lastError);

    chrome.contextMenus.create({
      id: 'open-full-manager',
      title: 'Tüm indirme geçmişini göster',
      contexts: ['action']
    }, () => void chrome.runtime.lastError);

    chrome.contextMenus.create({
      id: 'open-default-folder',
      title: 'İndirilenler klasörünü aç',
      contexts: ['action']
    }, () => void chrome.runtime.lastError);
  });
}

async function openOrFocusFullManager() {
  const targetUrl = chrome.runtime.getURL('manager.html?mode=tab');
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('manager.html*') });
  if (tabs.length > 0) {
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
}

function recordSpeedSample(item) {
  const now = Date.now();
  if (!item || item.state !== 'in_progress' || item.paused) {
    computedSpeeds.set(item.id, 0);
    speedSamples.delete(item.id);
    return;
  }

  let arr = speedSamples.get(item.id);
  if (!arr) {
    arr = [];
    speedSamples.set(item.id, arr);
  }
  arr.push({ t: now, b: item.bytesReceived || 0 });

  const cutoff = now - 3500;
  while (arr.length > 2 && arr[0].t < cutoff) {
    arr.shift();
  }

  if (arr.length >= 2) {
    const first = arr[0];
    const last = arr[arr.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt > 0.12) {
      const delta = last.b - first.b;
      computedSpeeds.set(item.id, delta > 0 ? delta / dt : 0);
    }
  }
}

async function getDownloadSnapshot(query = null) {
  const searchQuery = query && typeof query === 'object' ? { ...query } : { orderBy: ['-startTime'] };
  if (Array.isArray(searchQuery.ids)) {
    const fetched = await Promise.all(
      searchQuery.ids
        .filter((id) => typeof id === 'number')
        .map(async (id) => {
          const res = await chrome.downloads.search({ id });
          return res && res[0] ? normalizeDownloadItem(res[0]) : null;
        })
    );
    return fetched.filter(Boolean);
  }

  if (!searchQuery.orderBy) {
    searchQuery.orderBy = ['-startTime'];
  }
  const items = await chrome.downloads.search(searchQuery);
  return (items || []).filter(Boolean).map(normalizeDownloadItem);
}

async function syncActiveAlarm(hasActive) {
  try {
    const existing = await chrome.alarms.get(ACTIVE_RECONCILE_ALARM);
    if (hasActive && !existing) {
      chrome.alarms.create(ACTIVE_RECONCILE_ALARM, { periodInMinutes: 0.5 });
    } else if (!hasActive && existing) {
      await chrome.alarms.clear(ACTIVE_RECONCILE_ALARM);
    }
  } catch {
    // Ignore alarm errors
  }
}

function syncActivePolling(hasActive) {
  if (hasActive) {
    if (!activePollTimer) {
      activePollTimer = setInterval(() => {
        if (!activePollInFlight) {
          activePollInFlight = true;
          reconcileActiveDownloads(false).finally(() => {
            activePollInFlight = false;
          });
        }
      }, ACTIVE_POLL_MS);
    }
  } else if (activePollTimer) {
    clearInterval(activePollTimer);
    activePollTimer = null;
    activePollInFlight = false;
  }
}

async function writeSessionProjection(activeNormalized, removedIds = []) {
  if (!chrome.storage.session) return;
  const activeById = {};
  for (const item of activeNormalized) {
    activeById[item.id] = item;
  }
  try {
    await chrome.storage.session.set({
      [PROJECTION_KEY]: {
        seq: ++projectionSeq,
        updatedAt: Date.now(),
        activeById,
        removedIds
      }
    });
  } catch {
    // Ignore session quota/unavailable
  }
}

async function reconcileActiveDownloads(justCompleted = false, removedIds = []) {
  const settings = await getSettings();
  const isLight = settings.theme === 'light' || (settings.theme === 'system' && settings.resolvedLight);

  const rawActive = await chrome.downloads.search({ state: 'in_progress', orderBy: ['-startTime'] });
  const activeIds = new Set(rawActive.map((i) => i.id));

  for (const id of Array.from(speedSamples.keys())) {
    if (!activeIds.has(id)) {
      speedSamples.delete(id);
      computedSpeeds.delete(id);
    }
  }

  for (const item of rawActive) {
    recordSpeedSample(item);
  }

  const normalizedActive = rawActive.map(normalizeDownloadItem).filter(Boolean);
  await writeSessionProjection(normalizedActive, removedIds);

  const hasActive = normalizedActive.length > 0;
  await setToolbarIconState(hasActive ? 'active' : 'idle', isLight);
  syncActivePolling(hasActive);
  await syncActiveAlarm(hasActive);

  if (!settings.showBadge) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  if (hasActive) {
    if (clearCheckTimer) {
      clearTimeout(clearCheckTimer);
      clearCheckTimer = null;
    }

    const hasActionRequiredDanger = normalizedActive.some((i) => i.dangerStatus === 'action_required');
    if (hasActionRequiredDanger) {
      await chrome.action.setBadgeBackgroundColor({ color: '#e37400' });
      await chrome.action.setBadgeText({ text: '!' });
    } else if (normalizedActive.every((i) => i.paused)) {
      await chrome.action.setBadgeBackgroundColor({ color: '#5f6368' });
      await chrome.action.setBadgeText({ text: String(normalizedActive.length) });
    } else if (normalizedActive.length === 1 && normalizedActive[0].totalBytes > 0) {
      const pct = Math.min(
        99,
        Math.max(0, Math.floor((normalizedActive[0].bytesReceived / normalizedActive[0].totalBytes) * 100))
      );
      await chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
      await chrome.action.setBadgeText({ text: `${pct}%` });
    } else {
      await chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
      await chrome.action.setBadgeText({ text: String(normalizedActive.length) });
    }
  } else {
    if (justCompleted) {
      await chrome.action.setBadgeBackgroundColor({ color: '#188038' });
      await chrome.action.setBadgeText({ text: '✓' });
      if (clearCheckTimer) clearTimeout(clearCheckTimer);
      clearCheckTimer = setTimeout(() => {
        chrome.action.setBadgeText({ text: '' }).catch(() => {});
        clearCheckTimer = null;
      }, 3500);
    } else if (!clearCheckTimer) {
      await chrome.action.setBadgeText({ text: '' });
    }
  }
}

function queueDownloadRefresh(id, completedNow = false) {
  if (typeof id === 'number') pendingRefreshIds.add(id);
  if (completedNow) {
    reconcileActiveDownloads(true).catch(() => {});
    return;
  }
  if (refreshQueueTimer) return;
  refreshQueueTimer = setTimeout(() => {
    refreshQueueTimer = null;
    pendingRefreshIds.clear();
    reconcileActiveDownloads(false).catch(() => {});
  }, 80);
}

async function initializeServiceWorker() {
  const stored = await chrome.storage.local.get('settings');
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  await ensureNativeUiState(true);
  setupContextMenus();
  await reconcileActiveDownloads(false);
}

// Service Worker Lifecycle (xinghaix pattern)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients ? self.clients.claim() : Promise.resolve(),
      initializeServiceWorker()
    ])
  );
});

chrome.runtime.onInstalled.addListener(() => {
  initializeServiceWorker().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureNativeUiState(true).catch(() => {});
  reconcileActiveDownloads(false).catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    ensureNativeUiState(true).catch(() => {});
    reconcileActiveDownloads(false).catch(() => {});
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === ACTIVE_RECONCILE_ALARM) {
    reconcileActiveDownloads(false).catch(() => {});
  }
});

// Download Listeners
chrome.downloads.onCreated.addListener((item) => {
  ensureNativeUiState(false).catch(() => {});
  queueDownloadRefresh(item.id, false);
});

chrome.downloads.onErased.addListener((downloadId) => {
  speedSamples.delete(downloadId);
  computedSpeeds.delete(downloadId);
  reconcileActiveDownloads(false, [downloadId]).catch(() => {});
});

chrome.downloads.onChanged.addListener(async (delta) => {
  const completedNow = Boolean(delta.state && delta.state.current === 'complete');
  queueDownloadRefresh(delta.id, completedNow);

  if (completedNow) {
    const settings = await getSettings();
    if (settings.notifyOnComplete) {
      const items = await chrome.downloads.search({ id: delta.id });
      if (items && items[0]) {
        const name = extractBaseName(items[0].filename || items[0].finalUrl || items[0].url);
        chrome.notifications.create(`dl-done-${delta.id}`, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'İndirme tamamlandı',
          message: name
        });
      }
    }
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'quick-download-media') {
    const targetUrl = info.linkUrl || info.srcUrl;
    if (targetUrl && /^https?:|^ftp:|^data:|^blob:/i.test(targetUrl)) {
      chrome.downloads.download({ url: targetUrl }).catch(() => {});
    }
  } else if (info.menuItemId === 'open-full-manager') {
    openOrFocusFullManager();
  } else if (info.menuItemId === 'open-default-folder') {
    chrome.downloads.showDefaultFolder();
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-full-manager') {
    openOrFocusFullManager();
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId.startsWith('dl-done-')) {
    const id = Number(notifId.replace('dl-done-', ''));
    if (!Number.isNaN(id)) {
      chrome.downloads.show(id);
    }
    chrome.notifications.clear(notifId);
  }
});

// RPC Message Handler for Popup & Tab
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return false;

  if (msg.type === 'GET_SNAPSHOT') {
    getDownloadSnapshot(msg.query || null)
      .then((items) => sendResponse({ ok: true, items }))
      .catch((err) => sendResponse({ ok: false, error: String(err), items: [] }));
    return true;
  }

  if (msg.type === 'OPEN_FULL_TAB') {
    openOrFocusFullManager()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});
