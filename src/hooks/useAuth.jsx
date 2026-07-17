import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { syncManager } from "../lib/sync/syncManager";

const AuthContext = createContext(null);

const NO_CLIENT_ERROR = { message: "لسه معملناش ربط مع Supabase (متغيرات البيئة ناقصة). راجع .env.example." };

/**
 * Session persistence: supabase-js already persists the session to
 * localStorage under its own key and refreshes it silently in the
 * background — we don't need to hand-roll any of that. This provider's job
 * is just to (a) read the session once on mount so the UI doesn't flash a
 * "logged out" state while that lookup is in flight, and (b) subscribe to
 * onAuthStateChange so login/logout/token-refresh in *any* tab updates
 * every component reading useAuth() immediately.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Supabase fires this when the user lands back on the app via the
      // password-reset email link — it establishes a real (temporary)
      // session for the sole purpose of letting them set a new password.
      // We flag it so ResetPassword.jsx can tell "logged in normally"
      // apart from "here to set a new password", since both look like
      // a truthy `session` otherwise.
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") setIsPasswordRecovery(false);
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Drive the sync engine off the same session state, rather than having
  // every screen that cares about sync re-derive "are we logged in" itself.
  // Skipped during a password-recovery session — that's a temporary session
  // for setting a new password, not a real "signed in, start syncing" state.
  useEffect(() => {
    const userId = session?.user?.id;
    if (userId && !isPasswordRecovery) {
      syncManager.start(userId);
    } else {
      syncManager.stop();
    }
  }, [session?.user?.id, isPasswordRecovery]);

  async function signUp(email, password) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/login` },
    });
    return { error };
  }

  async function signIn(email, password) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async function resetPasswordForEmail(email) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  }

  async function updatePassword(newPassword) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    return { error };
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    isPasswordRecovery,
    isConfigured: !!supabase,
    signUp,
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
