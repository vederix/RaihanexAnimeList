/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";

export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  displayName: "User",
  avatarUrl: "",
  logout: async () => {},
  updateProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Ambil session aktif saat pertama kali mount
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (err) {
        console.error("Gagal mendapatkan sesi auth:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Langganan perubahan auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.display_name ||
      (user?.email ? user.email.split("@")[0] : "User")
    );
  }, [user]);

  const avatarUrl = useMemo(() => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=dc2626&color=fff&size=128&bold=true`;
  }, [displayName]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (newDisplayName) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: newDisplayName },
    });
    if (error) throw error;
    if (data.user) {
      setUser(data.user);
    }
    return data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      displayName,
      avatarUrl,
      logout,
      updateProfile,
    }),
    [user, session, loading, displayName, avatarUrl, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
};
