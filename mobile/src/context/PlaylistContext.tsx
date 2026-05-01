import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getPlaylists,
  createPlaylist as apiCreatePlaylist,
  deletePlaylist as apiDeletePlaylist,
  getPlaylistTracks,
  addTrackToPlaylist as apiAddTrackToPlaylist,
  removeTrackFromPlaylist as apiRemoveTrackFromPlaylist,
  updatePlaylist as apiUpdatePlaylist,
  type Playlist,
  type PlaylistTrack,
} from '../services/libraryService';
import { useAuth } from './AuthContext';
import { LocalSong, RemoteTrack } from '../types/music';
import { supabase } from '../services/supabase';

interface PlaylistContextType {
  playlists: Playlist[];
  loading: boolean;
  refreshPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  getTracks: (playlistId: string) => Promise<PlaylistTrack[]>;
  addTrack: (playlistId: string, track: LocalSong | RemoteTrack) => Promise<void>;
  removeTrack: (playlistId: string, trackId: string) => Promise<void>;
  updatePlaylist: (id: string, name: string) => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPlaylists = useCallback(async (silent = false) => {
    if (!user) {
      return;
    }
    
    // Only show loading spinner on initial fetch or if explicitly requested
    if (!silent && playlists.length === 0) {
      setLoading(true);
    }

    try {
      // 1. Fetch playlists
      const { data: playlistsData, error: plError } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (plError) throw plError;

      // 2. Enrich with track count and top 3 images
      const enriched = await Promise.all((playlistsData || []).map(async (pl) => {
        const { data: tracks, error: tError, count } = await supabase
          .from('playlist_tracks')
          .select('track_id, track_metadata', { count: 'exact' })
          .eq('playlist_id', pl.id)
          .order('position', { ascending: true });
        
        return {
          ...pl,
          track_count: count || 0,
          top_artworks: (tracks || []).slice(0, 3).map(t => t.track_metadata.artwork).filter(Boolean) as string[],
          track_ids: (tracks || []).map(t => t.track_id)
        };
      }));

      setPlaylists(enriched);
    } catch (error) {
      console.error('[PlaylistContext] refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshPlaylists();
  }, [refreshPlaylists]);

  const createPlaylist = async (name: string, description?: string) => {
    const newPlaylist = await apiCreatePlaylist(name, description);
    setPlaylists(prev => [newPlaylist, ...prev]);
    return newPlaylist;
  };

  const deletePlaylist = async (id: string) => {
    await apiDeletePlaylist(id);
    setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const getTracks = async (playlistId: string) => {
    return await getPlaylistTracks(playlistId);
  };

  const addTrack = async (playlistId: string, track: LocalSong | RemoteTrack) => {
    // Optimistic update for instant UI feedback
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const currentIds = p.track_ids || [];
        if (currentIds.includes(track.id)) return p;
        return {
          ...p,
          track_ids: [...currentIds, track.id],
          track_count: (p.track_count || 0) + 1
        };
      }
      return p;
    }));

    try {
      await apiAddTrackToPlaylist(playlistId, track);
      await refreshPlaylists(); // Get definitive state from DB
    } catch (error) {
      console.error('[PlaylistContext] addTrack error:', error);
      await refreshPlaylists(); // Rollback to actual DB state
      throw error;
    }
  };

  const removeTrack = async (playlistId: string, trackId: string) => {
    // Optimistic update
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const currentIds = p.track_ids || [];
        return {
          ...p,
          track_ids: currentIds.filter(id => id !== trackId),
          track_count: Math.max(0, (p.track_count || 0) - 1)
        };
      }
      return p;
    }));

    try {
      await apiRemoveTrackFromPlaylist(playlistId, trackId);
      await refreshPlaylists();
    } catch (error) {
      console.error('[PlaylistContext] removeTrack error:', error);
      await refreshPlaylists();
      throw error;
    }
  };

  const updatePlaylist = async (playlistId: string, name: string) => {
    await apiUpdatePlaylist(playlistId, { name });
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, name } : p));
  };

  return (
    <PlaylistContext.Provider value={{
      playlists,
      loading,
      refreshPlaylists,
      createPlaylist,
      deletePlaylist,
      getTracks,
      addTrack,
      removeTrack,
      updatePlaylist,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
}
