const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

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

export async function initGmailClient() {
  if (gapiInited && gisInited) return true;

  const clientId = localStorage.getItem('gmail_client_id');
  const apiKey = localStorage.getItem('gmail_api_key');

  if (!clientId || !apiKey) return false;

  try {
    await loadGapi();
    await loadGis();

    await new Promise((resolve, reject) => {
      gapi.load('client', { callback: resolve, onerror: reject });
    });

    await gapi.client.init({ apiKey, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'] });
    gapiInited = true;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: (resp) => {
        if (resp.access_token) {
          localStorage.setItem('gmail_access_token', resp.access_token);
        }
      },
    });
    gisInited = true;
    return true;
  } catch {
    return false;
  }
}

function loadGapi() {
  return new Promise((resolve, reject) => {
    if (window.gapi) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function connectGmail() {
  const initialized = await initGmailClient();
  if (!initialized) return { ok: false, error: 'Gmail not configured. Add Client ID and API Key in Settings > Connected accounts.' };

  return new Promise((resolve) => {
    tokenClient.callback = (resp) => {
      if (resp.access_token) {
        localStorage.setItem('gmail_access_token', resp.access_token);
        gapi.client.setToken({ access_token: resp.access_token });

        gapi.client.gmail.users.getProfile({ userId: 'me' })
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
  if (gapi?.client?.getToken()) {
    google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {});
    gapi.client.setToken(null);
  }
}

export async function getRecentEmails(maxResults = 10) {
  if (!isGmailConnected()) return [];
  try {
    const init = await initGmailClient();
    if (!init) return [];

    const token = localStorage.getItem('gmail_access_token');
    gapi.client.setToken({ access_token: token });

    const response = await gapi.client.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'in:inbox',
    });

    const messages = response.result.messages || [];
    const emails = [];

    for (const msg of messages.slice(0, 5)) {
      const detail = await gapi.client.gmail.users.messages.get({
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
    gapi.client.setToken({ access_token: token });

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\n');

    const base64Encoded = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_');

    await gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: { raw: base64Encoded },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to send email' };
  }
}
