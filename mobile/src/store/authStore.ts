import { create } from 'zustand';
import { Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  setAsGuest: () => void;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  processDeepLink: (url: string | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  isGuest: false,

  initialize: async () => {
    set({ loading: true });

    // 1. Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    set({ 
      session, 
      user: session?.user ?? null, 
      loading: false,
      isGuest: session ? false : get().isGuest
    });

    // 2. Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ 
        session, 
        user: session?.user ?? null, 
        loading: false,
        isGuest: session ? false : get().isGuest
      });
    });

    // 3. Check initial URL for deep link
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      await get().processDeepLink(initialUrl);
    }

    // 4. Listen for deep links
    Linking.addEventListener('url', ({ url }) => {
      get().processDeepLink(url);
    });
  },

  setAsGuest: () => {
    set({ isGuest: true, user: null, session: null });
  },

  signInWithOAuth: async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'https://mfscpayload-690.github.io/laika-music/auth.html',
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (data?.url) {
      await Linking.openURL(data.url);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isGuest: false });
  },

  processDeepLink: async (url) => {
    if (!url) return;
    
    if (url.includes('auth-callback')) {
      console.log('[AuthStore] Auth callback received, processing tokens...');
      const parts = url.split('#');
      if (parts.length > 1) {
        const hash = parts[1];
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) console.error('[AuthStore] setSession error:', error);
        }
      }
    }
  },
}));
