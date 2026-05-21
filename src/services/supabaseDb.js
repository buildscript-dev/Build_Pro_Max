import { supabase } from '../services/supabaseClient';

const TABLES = ['notes', 'tasks', 'events', 'contacts', 'chat_messages', 'notifications', 'files', 'reminders', 'goals', 'schedule', 'settings'];

export async function syncToSupabase(tableName, data) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { ok: false, error: 'Not authenticated' };

    // Clean up arrays/objects to ensure user_id exists for RLS
    const payload = Array.isArray(data)
      ? data.map(item => ({ ...item, user_id: item.user_id || userId }))
      : { ...data, user_id: data.user_id || userId };

    const { error } = await supabase
      .from(tableName)
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error(`syncToSupabase error (${tableName}):`, err.message);
    return { ok: false, error: err.message };
  }
}

export async function deleteFromSupabase(tableName, id) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error(`deleteFromSupabase error (${tableName}):`, err.message);
    return { ok: false, error: err.message };
  }
}

export async function fetchFromSupabase(tableName, userId) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (err) {
    console.error(`fetchFromSupabase error (${tableName}):`, err.message);
    return { ok: false, error: err.message, data: [] };
  }
}

export async function fetchAllFromSupabase(userId) {
  const settled = await Promise.all(TABLES.map(t => fetchFromSupabase(t, userId)));
  return TABLES.reduce((acc, table, i) => {
    acc[table] = settled[i].data || [];
    return acc;
  }, {});
}

export async function uploadFile(file, userId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('user-files')
      .upload(fileName, file);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(fileName);

    return { ok: true, url: publicUrl, path: fileName };
  } catch (err) {
    console.error('uploadFile error:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function deleteFile(path) {
  try {
    const { error } = await supabase.storage
      .from('user-files')
      .remove([path]);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('deleteFile error:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function listUserFiles(userId) {
  try {
    const { data, error } = await supabase.storage
      .from('user-files')
      .list(userId);
    if (error) throw error;
    return { ok: true, files: data || [] };
  } catch (err) {
    console.error('listUserFiles error:', err.message);
    return { ok: false, error: err.message, files: [] };
  }
}

export function subscribeToAll(userId, onDatabaseChange) {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`user_changes_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      const record = payload.new || payload.old;
      if (record?.user_id === userId) {
        onDatabaseChange(payload.table, payload.eventType, payload.new, payload.old);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
