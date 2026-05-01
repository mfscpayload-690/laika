import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  setAsGuest: () => void;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle deep links for OAuth
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      
      console.log('[AuthContext] Handling deep link:', url);
      
      if (url.includes('auth-callback')) {
        // Parse access_token and refresh_token from the hash
        const parts = url.split('#');
        if (parts.length > 1) {
          const hash = parts[1];
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          
          if (access_token && refresh_token) {
            console.log('[AuthContext] Setting session from deep link');
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) console.error('[AuthContext] setSession error:', error);
          }
        }
      }
    };

    // Listen for incoming links while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check for initial URL if app was opened by link
    Linking.getInitialURL().then(url => {
      handleDeepLink(url);
    });

    // Listen for auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) setIsGuest(false);
    });

    return () => {
      subscription.remove();
      authSub.unsubscribe();
    };
  }, []);

  const setAsGuest = () => {
    setIsGuest(true);
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'laika-music://auth-callback',
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (data?.url) {
      await Linking.openURL(data.url);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isGuest, setAsGuest, signInWithOAuth, signOut }}>
      {children}
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
