import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { initializeSession, validateSession, clearSession } from '@/lib/sessionSecurity';
import { clearKeyCache } from '@/lib/secureStorage';
import { SessionExpiredDialog } from '@/components/common/SessionExpiredDialog';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { name?: string; avatar?: string | null }) => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const hadSession = useRef(false); // Track if user had a session before
  const isFetchingProfile = useRef(false); // Prevent duplicate concurrent fetches
  const initialSessionLoaded = useRef(false); // Track if getSession already ran

  const fetchProfile = async (userId: string) => {
    // Guard: prevent duplicate concurrent fetches (race condition on cached sessions)
    if (isFetchingProfile.current) return null;
    isFetchingProfile.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    } finally {
      isFetchingProfile.current = false;
    }
  };

  // Handle going to login page
  const handleGoToLogin = useCallback(() => {
    setSessionExpired(false);
    // Clear all state
    setUser(null);
    setSession(null);
    setProfile(null);
    // Navigate to login
    // Bug fix #12: Use hash navigation for HashRouter
    window.location.hash = '#/login';
    window.location.reload();
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Check if session was lost (user had session before but now doesn't)
        if (hadSession.current && !newSession && event === 'SIGNED_OUT') {
          // Don't show dialog for manual sign out
          // Dialog will be shown by TOKEN_REFRESHED failure or session check
        }

        // Handle token refresh failure - this means session expired
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          setSessionExpired(true);
          return;
        }

        // Track if user has had a session
        if (newSession) {
          hadSession.current = true;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlock
        // Skip INITIAL_SESSION: getSession() below already handles the first load
        if (newSession?.user) {
          if (event !== 'INITIAL_SESSION') {
            setTimeout(() => {
              fetchProfile(newSession.user.id).then(setProfile);
            }, 0);
          }
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        hadSession.current = true;
        fetchProfile(existingSession.user.id).then(setProfile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Session security: periodic validation
  useEffect(() => {
    if (session && profile) {
      // Initialize session on login
      initializeSession(profile.user_id);

      // Start periodic session validation
      sessionCheckInterval.current = setInterval(async () => {
        // Check session security
        if (!validateSession()) {
          console.warn('[Security] Session tampering detected');
          setSessionExpired(true);
          return;
        }

        // Also check if token is still valid with Supabase
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error || !currentSession) {
          console.warn('[Security] Session no longer valid');
          setSessionExpired(true);
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, [session, profile]);

  const signUp = useCallback(async (email: string, password: string, name: string, role: UserRole) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role
        }
      }
    });

    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Reset session expired state on new login attempt
    setSessionExpired(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    // Clear security caches
    clearSession();
    clearKeyCache();

    // Reset tracking
    hadSession.current = false;
    setSessionExpired(false);

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (updates: { name?: string; avatar?: string | null }) => {
    if (!user) return { error: new Error('Not authenticated') };

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (error) {
      return { error: error as unknown as Error };
    }

    const refreshed = await fetchProfile(user.id);
    if (refreshed) setProfile(refreshed);
    return { error: null };
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!session,
  }), [user, profile, session, loading, signUp, signIn, signOut, updateProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}

      {/* Session Expired Dialog */}
      <SessionExpiredDialog
        open={sessionExpired}
        onLogin={handleGoToLogin}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRole(): UserRole | undefined {
  const { profile } = useAuth();
  return profile?.role as UserRole | undefined;
}

export function hasPermission(role: UserRole | undefined, permission: string): boolean {
  if (!role) return false;

  const permissions: Record<UserRole, string[]> = {
    warehouse: ['view_stock', 'scan_barcode', 'create_request', 'stock_in', 'ship_stock'],
    cashier: ['view_stock', 'pos', 'cash_transfer', 'view_requests', 'receive_goods', 'receive_po', 'view_sales', 'view_cash', 'view_reports'],
    auditor: ['view_surat_jalan', 'approve_reject', 'view_reports', 'verify_shipments'],
    main_office: ['approve_requests', 'manage_cash', 'view_reports'],
    admin: ['*'],
  };

  if (role === 'admin') return true;
  return permissions[role]?.includes(permission) || false;
}

