import { supabase } from '../services/supabaseClient';

export async function signupWithEmail(email, password, name) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0] },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) throw error;

    if (data.user?.identities?.length === 0) {
      return { ok: false, error: 'Email already registered' };
    }

    return {
      ok: true,
      user: formatUser(data.user),
      needsEmailConfirmation: !data.session,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Signup failed' };
  }
}

export async function loginWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { ok: false, error: 'Invalid email or password' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { ok: false, error: 'Please verify your email before signing in' };
      }
      throw error;
    }

    return { ok: true, user: formatUser(data.user), session: data.session };
  } catch (err) {
    return { ok: false, error: err.message || 'Login failed' };
  }
}

export async function loginWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;

    return { ok: true, url: data.url };
  } catch (err) {
    return { ok: false, error: err.message || 'Google login failed' };
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Logout failed' };
  }
}

export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Password reset failed' };
  }
}

export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Password update failed' };
  }
}

export async function updateProfile(updates) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) throw error;
    return { ok: true, user: formatUser(data.user) };
  } catch (err) {
    return { ok: false, error: err.message || 'Profile update failed' };
  }
}

export async function deleteAccount() {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'No user logged in' };

    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      await supabase.auth.signOut();
      return { ok: true };
    }

    await supabase.auth.signOut();
    return { ok: true };
  } catch (err) {
    await supabase.auth.signOut();
    return { ok: true };
  }
}

export function getCurrentUser() {
  return new Promise((resolve) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolve(session?.user ? formatUser(session.user) : null);
    });
  });
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? formatUser(session.user) : null, session);
  });

  return () => subscription.unsubscribe();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function formatUser(user) {
  if (!user) return null;
  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const avatar = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    id: user.id,
    email: user.email,
    name,
    avatar,
    timezone: user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: user.created_at,
    provider: user.app_metadata?.provider || 'email',
  };
}
