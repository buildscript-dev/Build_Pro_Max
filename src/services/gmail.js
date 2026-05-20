const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

let tokenClient = null;
let initPromise = null;

export function isGmailConnected() {
  try {
    return !!localStorage.getItem('gmail_access_token');
  } catch { return false; }
}

export function getGmailEmail() {
  try {
    return localStorage.getItem('gmail_email') || '';
  } catch { return ''; }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (src.includes('api.js') && window.gapi) { resolve(); return; }
    if (src.includes('gsi/client') && window.google?.accounts) { resolve(); return; }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function initGmailClient() {
  if (initPromise) return initPromise;

  const clientId = localStorage.getItem('gmail_client_id');
  const apiKey = localStorage.getItem('gmail_api_key');

  if (!clientId || !apiKey) {
    return false;
  }

  initPromise = (async () => {
    try {
      await loadScript('https://apis.google.com/js/api.js');
      await loadScript('https://accounts.google.com/gsi/client');

      await new Promise((resolve, reject) => {
        if (window.gapi?.client) { resolve(); return; }
        window.gapi.load('client', { callback: resolve, onerror: reject });
      });

      if (!window.gapi.client.getToken) {
        await window.gapi.client.init({ apiKey, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'] });
      }

      const savedToken = localStorage.getItem('gmail_access_token');
      if (savedToken) {
        window.gapi.client.setToken({ access_token: savedToken });
      }

      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GMAIL_SCOPE,
        callback: (resp) => {
          if (resp.access_token) {
            localStorage.setItem('gmail_access_token', resp.access_token);
            window.gapi.client.setToken({ access_token: resp.access_token });
          }
        },
      });
      return true;
    } catch (e) {
      initPromise = null; // Reset so re-init is possible after credentials are added
      return false;
    }
  })();

  return initPromise;
}

export async function connectGmail() {
  const initialized = await initGmailClient();
  if (!initialized) return { ok: false, error: 'Gmail not configured. Add Client ID and API Key in Settings > Connected accounts.' };

  return new Promise((resolve) => {
    tokenClient.callback = (resp) => {
      if (resp.access_token) {
        localStorage.setItem('gmail_access_token', resp.access_token);
        window.gapi.client.setToken({ access_token: resp.access_token });

        window.gapi.client.gmail.users.getProfile({ userId: 'me' })
          .then((profile) => {
            localStorage.setItem('gmail_email', profile.result.emailAddress);
            resolve({ ok: true, email: profile.result.emailAddress });
          })
          .catch(() => resolve({ ok: true, email: 'Connected' }));
      } else {
        resolve({ ok: false, error: 'Authentication failed' });
      }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function disconnectGmail() {
  localStorage.removeItem('gmail_access_token');
  localStorage.removeItem('gmail_email');
  const token = window.gapi?.client?.getToken?.();
  if (token?.access_token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {});
  }
  if (window.gapi?.client?.setToken) {
    window.gapi.client.setToken(null);
  }
}

export async function getRecentEmails(maxResults = 10) {
  if (!isGmailConnected()) return [];
  try {
    const init = await initGmailClient();
    if (!init) return [];

    const token = localStorage.getItem('gmail_access_token');
    window.gapi.client.setToken({ access_token: token });

    const response = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'in:inbox',
    });

    const messages = response.result.messages || [];
    const emails = [];

    for (const msg of messages.slice(0, 5)) {
      const detail = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const headers = {};
      (detail.result.payload?.headers || []).forEach(h => { headers[h.name] = h.value; });
      emails.push({
        id: msg.id,
        from: headers['From'] || 'Unknown',
        subject: headers['Subject'] || '(no subject)',
        date: headers['Date'] || '',
      });
    }
    return emails;
  } catch {
    return [];
  }
}

export async function sendEmail(to, subject, body) {
  if (!isGmailConnected()) return { ok: false, error: 'Gmail not connected' };
  try {
    const init = await initGmailClient();
    if (!init) return { ok: false, error: 'Gmail client not initialized' };

    const token = localStorage.getItem('gmail_access_token');
    window.gapi.client.setToken({ access_token: token });

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\n');

    const base64Encoded = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_');

    await window.gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: { raw: base64Encoded },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to send email' };
  }
}
