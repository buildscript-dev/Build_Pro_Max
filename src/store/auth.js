import {
  signupWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logout,
  resetPassword,
  updatePassword,
  updateProfile,
  deleteAccount,
  getCurrentUser,
  onAuthStateChange,
  getSession,
} from '../services/supabaseAuth';

export {
  signupWithEmail as signup,
  loginWithEmail as login,
  loginWithGoogle,
  logout,
  resetPassword,
  updatePassword,
  updateProfile,
  deleteAccount,
  getCurrentUser,
  onAuthStateChange,
  getSession,
};
// force cache invalidation
