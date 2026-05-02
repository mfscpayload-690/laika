import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMusicStore } from '../store/musicStore';
import { useLikesStore } from '../store/likesStore';
import { usePlaylistStore } from '../store/playlistStore';

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initializeAuth = useAuthStore(state => state.initialize);
  const initializeMusic = useMusicStore(state => state.initialize);
  const fetchLikes = useLikesStore(state => state.fetchLikes);
  const fetchPlaylists = usePlaylistStore(state => state.fetchPlaylists);
  const user = useAuthStore(state => state.user);
  const isGuest = useAuthStore(state => state.isGuest);

  // 1. Core Startup (Auth & Player)
  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      await initializeMusic();
    };
    init();
  }, [initializeAuth, initializeMusic]);

  // 2. Data Hydration (on User login/change)
  useEffect(() => {
    if (user && !isGuest) {
      fetchLikes();
      fetchPlaylists();
    }
  }, [user, isGuest, fetchLikes, fetchPlaylists]);

  return <>{children}</>;
};
