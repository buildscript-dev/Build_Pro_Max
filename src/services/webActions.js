// Hermes Web/App Launcher — opens URLs on desktop, deep-links to native apps on mobile

const APPS = {
  gmail: {
    name: 'Gmail',
    web: 'https://mail.google.com',
    ios: 'googlegmail://',
    android: 'intent://mail.google.com/#Intent;scheme=https;package=com.google.android.gm;S.browser_fallback_url=https://mail.google.com;end',
    keywords: ['gmail', 'email', 'mail', 'inbox', 'compose'],
  },
  youtube: {
    name: 'YouTube',
    web: 'https://youtube.com',
    ios: 'youtube://',
    android: 'intent://youtube.com/#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=https://youtube.com;end',
    search_web: 'https://youtube.com/results?search_query={q}',
    search_ios: 'youtube://results?search_query={q}',
    search_android: 'intent://youtube.com/results?search_query={q}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=https://youtube.com/results?search_query={q};end',
    keywords: ['youtube', 'yt', 'video', 'watch'],
  },
  maps: {
    name: 'Google Maps',
    web: 'https://maps.google.com',
    ios: 'comgooglemaps://',
    android: 'intent://maps.google.com/#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=https://maps.google.com;end',
    search_web: 'https://www.google.com/maps/search/{q}',
    search_ios: 'comgooglemaps://?q={q}',
    search_android: 'intent://maps.google.com/?q={q}#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=https://maps.google.com/search?q={q};end',
    keywords: ['maps', 'google maps', 'navigate', 'directions', 'location'],
  },
  drive: {
    name: 'Google Drive',
    web: 'https://drive.google.com',
    ios: 'googledrive://',
    android: 'intent://drive.google.com/#Intent;scheme=https;package=com.google.android.apps.docs;S.browser_fallback_url=https://drive.google.com;end',
    keywords: ['drive', 'google drive', 'docs', 'sheets', 'slides'],
  },
  whatsapp: {
    name: 'WhatsApp',
    web: 'https://web.whatsapp.com',
    ios: 'whatsapp://',
    android: 'intent://send#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=https://web.whatsapp.com;end',
    keywords: ['whatsapp', 'wa', 'message', 'chat', 'text'],
  },
  instagram: {
    name: 'Instagram',
    web: 'https://instagram.com',
    ios: 'instagram://',
    android: 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=https://instagram.com;end',
    keywords: ['instagram', 'ig', 'insta'],
  },
  twitter: {
    name: 'X / Twitter',
    web: 'https://x.com',
    ios: 'twitter://',
    android: 'intent://x.com/#Intent;scheme=https;package=com.twitter.android;S.browser_fallback_url=https://x.com;end',
    search_web: 'https://x.com/search?q={q}',
    keywords: ['twitter', 'x', 'tweet'],
  },
  spotify: {
    name: 'Spotify',
    web: 'https://open.spotify.com',
    ios: 'spotify://',
    android: 'intent://open.spotify.com/#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=https://open.spotify.com;end',
    search_web: 'https://open.spotify.com/search/{q}',
    search_ios: 'spotify://search/{q}',
    keywords: ['spotify', 'music', 'playlist', 'song'],
  },
  netflix: {
    name: 'Netflix',
    web: 'https://netflix.com',
    ios: 'nflx://',
    android: 'intent://netflix.com/#Intent;scheme=https;package=com.netflix.mediaclient;S.browser_fallback_url=https://netflix.com;end',
    keywords: ['netflix', 'watch', 'show', 'movie', 'series'],
  },
  github: {
    name: 'GitHub',
    web: 'https://github.com',
    ios: 'github://',
    android: 'intent://github.com/#Intent;scheme=https;package=com.github.android;S.browser_fallback_url=https://github.com;end',
    search_web: 'https://github.com/search?q={q}',
    keywords: ['github', 'git', 'repo', 'code', 'pull request'],
  },
  notion: {
    name: 'Notion',
    web: 'https://notion.so',
    ios: 'notion://',
    android: 'intent://notion.so/#Intent;scheme=https;package=notion.id;S.browser_fallback_url=https://notion.so;end',
    keywords: ['notion'],
  },
  slack: {
    name: 'Slack',
    web: 'https://app.slack.com',
    ios: 'slack://',
    android: 'intent://app.slack.com/#Intent;scheme=https;package=com.Slack;S.browser_fallback_url=https://app.slack.com;end',
    keywords: ['slack'],
  },
  linkedin: {
    name: 'LinkedIn',
    web: 'https://linkedin.com',
    ios: 'linkedin://',
    android: 'intent://linkedin.com/#Intent;scheme=https;package=com.linkedin.android;S.browser_fallback_url=https://linkedin.com;end',
    keywords: ['linkedin'],
  },
  amazon: {
    name: 'Amazon',
    web: 'https://amazon.com',
    ios: 'com.amazon.mobile.shopping://',
    android: 'intent://amazon.com/#Intent;scheme=https;package=com.amazon.mShop.android.shopping;S.browser_fallback_url=https://amazon.com;end',
    search_web: 'https://www.amazon.com/s?k={q}',
    keywords: ['amazon', 'shop', 'buy', 'order'],
  },
  google: {
    name: 'Google',
    web: 'https://google.com',
    ios: 'googlechrome://',
    android: 'intent://google.com/#Intent;scheme=https;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=https://google.com;end',
    search_web: 'https://www.google.com/search?q={q}',
    keywords: ['google', 'search', 'look up'],
  },
  telegram: {
    name: 'Telegram',
    web: 'https://web.telegram.org',
    ios: 'tg://',
    android: 'intent://telegram.org/#Intent;scheme=https;package=org.telegram.messenger;S.browser_fallback_url=https://web.telegram.org;end',
    keywords: ['telegram', 'tg'],
  },
};

function getDevice() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'desktop';
}

function buildUrl(app, query) {
  const device = getDevice();
  const q = encodeURIComponent(query || '');

  if (query && app.search_web) {
    if (device === 'ios' && app.search_ios) return app.search_ios.replace('{q}', q);
    if (device === 'android' && app.search_android) return app.search_android.replace('{q}', q);
    return app.search_web.replace('{q}', q);
  }

  if (device === 'ios' && app.ios) return app.ios;
  if (device === 'android' && app.android) return app.android;
  return app.web;
}

// Resolve app name/keyword to registry key
export function resolveApp(nameOrKey) {
  const key = (nameOrKey || '').toLowerCase().trim();
  if (APPS[key]) return key;
  for (const [k, app] of Object.entries(APPS)) {
    if (app.keywords?.some(kw => {
      if (kw.length <= 2) return key === kw; // exact match for short keywords like "x", "ig"
      return key === kw || key.includes(kw) || kw.includes(key);
    })) return k;
  }
  return null;
}

// Open an app or URL — handles desktop/iOS/Android automatically
export function openApp(appName, query = '', rawUrl = '') {
  const device = getDevice();

  // Raw URL passed directly (no app key)
  if (rawUrl && !appName) {
    window.open(rawUrl, '_blank', 'noopener');
    return { opened: true, target: rawUrl, device };
  }

  const key = resolveApp(appName);
  const app = key ? APPS[key] : null;

  if (!app) {
    // Unknown app — try as a search or URL
    const target = rawUrl || (appName ? `https://www.google.com/search?q=${encodeURIComponent(appName + ' ' + query)}` : null);
    if (target) window.open(target, '_blank', 'noopener');
    return { opened: !!target, target, device };
  }

  const url = buildUrl(app, query);

  if (device === 'desktop') {
    window.open(url, '_blank', 'noopener');
    return { opened: true, target: url, app: app.name, device };
  }

  // Mobile: try deep link, fall back to web URL after 800ms
  const webFallback = query && app.search_web
    ? app.search_web.replace('{q}', encodeURIComponent(query))
    : app.web;

  window.location.href = url;
  setTimeout(() => {
    try { window.open(webFallback, '_blank', 'noopener'); } catch {}
  }, 800);

  return { opened: true, target: url, app: app.name, device };
}

// Return list of supported app names for the system prompt
export function getSupportedApps() {
  return Object.values(APPS).map(a => a.name).join(', ');
}

export { APPS, getDevice };
