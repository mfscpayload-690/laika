import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getLikes, likeTrack, unlikeTrack, type LikedTrack } from '../services/libraryService';
import { useAuth } from './AuthContext';
import type { LocalSong, RemoteTrack } from '../types/music';

interface LikesContextType {
  likedTrackIds: Set<string>;
  likedTracks: LikedTrack[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: LocalSong | RemoteTrack) => Promise<void>;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const LikesContext = createContext<LikesContextType | undefined>(undefined);

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const { session, isGuest } = useAuth();
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session || isGuest) {
      setLikedTracks([]);
      setLikedTrackIds(new Set());
      return;
    }
    try {
      setIsLoading(true);
      const tracks = await getLikes();
      setLikedTracks(tracks);
      setLikedTrackIds(new Set(tracks.map(t => t.track_id)));
    } catch (e) {
      console.warn('[LikesContext] Failed to load likes:', e);
    } finally {
      setIsLoading(false);
    }
  }, [session, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isLikedFn = useCallback(
    (trackId: string) => likedTrackIds.has(trackId),
    [likedTrackIds],
  );

  const toggleLike = useCallback(async (track: LocalSong | RemoteTrack) => {
    console.log('[LikesContext] toggleLike attempt:', { trackId: track.id, isGuest, hasSession: !!session });
    
    if (isGuest || !session) {
      const { Alert } = require('react-native');
      Alert.alert(
        'Sign in Required',
        'Please sign in with Google or GitHub to save your favorite songs to your library.',
        [{ text: 'OK' }]
      );
      return;
    }

    const trackId = track.id;
    const alreadyLiked = likedTrackIds.has(trackId);

    // Optimistic UI update
    if (alreadyLiked) {
      setLikedTrackIds(prev => { const next = new Set(prev); next.delete(trackId); return next; });
      setLikedTracks(prev => prev.filter(t => t.track_id !== trackId));
    } else {
      setLikedTrackIds(prev => new Set(prev).add(trackId));
    }

    try {
      if (alreadyLiked) {
        await unlikeTrack(trackId);
      } else {
        await likeTrack(track);
        // Reload to get the full record with created_at
        await refresh();
      }
    } catch (e) {
      console.warn('[LikesContext] toggleLike failed, reverting:', e);
      // Revert on error
      await refresh();
    }
  }, [session, isGuest, likedTrackIds, refresh]);

  return (
    <LikesContext.Provider value={{ likedTrackIds, likedTracks, isLiked: isLikedFn, toggleLike, isLoading, refresh }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error('useLikes must be used inside LikesProvider');
  return ctx;
}
