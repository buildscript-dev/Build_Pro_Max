const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

let notionInitPromise = null;

export function isNotionConnected() {
  try {
    return !!localStorage.getItem('notion_access_token');
  } catch { return false; }
}

export function getNotionEmail() {
  try {
    return localStorage.getItem('notion_email') || '';
  } catch { return ''; }
}

export function getNotionWorkspace() {
  try {
    return localStorage.getItem('notion_workspace') || '';
  } catch { return ''; }
}

async function notionFetch(path, options = {}) {
  const token = localStorage.getItem('notion_access_token');
  if (!token) throw new Error('Notion not connected');

  const url = path.startsWith('http') ? path : `${NOTION_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || `Notion API error (${res.status})`;
    if (res.status === 401) {
      disconnectNotion();
      throw new Error('Notion session expired. Reconnect in Settings.');
    }
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return notionFetch(path, options);
    }
    throw new Error(msg);
  }

  return res.json();
}

export function connectNotion(token) {
  if (!token || token.length < 10) {
    return { ok: false, error: 'Invalid Notion token' };
  }

  localStorage.setItem('notion_access_token', token);

  return notionFetch('/users/me')
    .then(user => {
      const email = user.person?.email || user.bot?.owner?.user?.name || 'Connected';
      const workspace = user.workspace_name || '';
      localStorage.setItem('notion_email', email);
      localStorage.setItem('notion_workspace', workspace);
      return { ok: true, email, workspace };
    })
    .catch(e => {
      localStorage.removeItem('notion_access_token');
      return { ok: false, error: e.message };
    });
}

export function disconnectNotion() {
  localStorage.removeItem('notion_access_token');
  localStorage.removeItem('notion_email');
  localStorage.removeItem('notion_workspace');
}

export async function searchPages(query = '') {
  const body = query
    ? { query, filter: { value: 'page', property: 'object' }, page_size: 20 }
    : { filter: { value: 'page', property: 'object' }, page_size: 20, sort: { direction: 'descending', timestamp: 'last_edited_time' } };

  const data = await notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return (data.results || []).map(page => ({
    id: page.id,
    title: page.properties?.title?.title?.[0]?.plain_text ||
           page.properties?.Name?.title?.[0]?.plain_text ||
           'Untitled',
    url: page.url || '',
    icon: page.icon?.emoji || page.icon?.type === 'external' ? '📄' : '',
    lastEdited: page.last_edited_time,
    object: page.object,
  }));
}

export async function searchDatabases(query = '') {
  const body = query
    ? { query, filter: { value: 'database', property: 'object' }, page_size: 20 }
    : { filter: { value: 'database', property: 'object' }, page_size: 20 };

  const data = await notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return (data.results || []).map(db => ({
    id: db.id,
    title: db.title?.[0]?.plain_text || 'Untitled Database',
    url: db.url || '',
  }));
}

export async function getPageBlocks(pageId) {
  const data = await notionFetch(`/blocks/${pageId}/children?page_size=50`);
  return (data.results || []).map(block => ({
    id: block.id,
    type: block.type,
    text: block[block.type]?.rich_text?.map(t => t.plain_text).join('') || '',
    children: block.has_children ? [] : null,
  }));
}

export async function appendBlocks(pageId, blocks) {
  const data = await notionFetch(`/blocks/${pageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({ children: blocks }),
  });
  return data.results || [];
}

export function createTextBlock(text, type = 'paragraph') {
  return {
    object: 'block',
    type,
    [type]: {
      rich_text: [{ type: 'text', text: { content: text } }],
    },
  };
}

export async function createPage(databaseId, properties) {
  const data = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId.replace(/-/g, '') },
      properties,
    }),
  });
  return data;
}

export async function queryDatabase(databaseId, filter = {}, sorts = []) {
  const body = { page_size: 20 };
  if (filter?.property) body.filter = filter;
  if (sorts.length > 0) body.sorts = sorts;

  const data = await notionFetch(`/databases/${databaseId.replace(/-/g, '')}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return (data.results || []).map(page => ({
    id: page.id,
    url: page.url,
    properties: page.properties,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  }));
}
