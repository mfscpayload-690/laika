import { create } from 'zustand';
import { supabase } from '../services/supabase';
import {
  createPlaylist as apiCreatePlaylist,
  deletePlaylist as apiDeletePlaylist,
  addTrackToPlaylist as apiAddTrackToPlaylist,
  removeTrackFromPlaylist as apiRemoveTrackFromPlaylist,
  updatePlaylist as apiUpdatePlaylist,
  getPlaylistTracks,
  type Playlist,
  type PlaylistTrack
} from '../services/libraryService';
import { LocalSong, RemoteTrack } from '../types/music';

interface PlaylistState {
  playlists: Playlist[];
  loading: boolean;

  // Actions
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrack: (playlistId: string, track: LocalSong | RemoteTrack) => Promise<void>;
  removeTrack: (playlistId: string, trackId: string) => Promise<void>;
  updatePlaylistName: (id: string, name: string) => Promise<void>;
  getTracks: (id: string) => Promise<PlaylistTrack[]>;
  clear: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  loading: false,

  fetchPlaylists: async () => {
    set({ loading: true });
    try {
      const { data: playlistsData, error: plError } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (plError) throw plError;

      const enriched = await Promise.all((playlistsData || []).map(async (pl) => {
        const { data: tracks, count } = await supabase
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

      set({ playlists: enriched, loading: false });
    } catch (error) {
      console.error('[PlaylistStore] fetch error:', error);
      set({ loading: false });
    }
  },

  createPlaylist: async (name, description) => {
    const newPlaylist = await apiCreatePlaylist(name, description);
    set({ playlists: [newPlaylist, ...get().playlists] });
    return newPlaylist;
  },

  deletePlaylist: async (id) => {
    await apiDeletePlaylist(id);
    set({ playlists: get().playlists.filter(p => p.id !== id) });
  },

  addTrack: async (playlistId, track) => {
    // Optimistic Update
    set({
      playlists: get().playlists.map(p => {
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
      })
    });

    try {
      await apiAddTrackToPlaylist(playlistId, track);
      await get().fetchPlaylists();
    } catch (error) {
      console.error('[PlaylistStore] addTrack error:', error);
      await get().fetchPlaylists();
      throw error;
    }
  },

  removeTrack: async (playlistId, trackId) => {
    set({
      playlists: get().playlists.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            track_ids: (p.track_ids || []).filter(id => id !== trackId),
            track_count: Math.max(0, (p.track_count || 0) - 1)
          };
        }
        return p;
      })
    });

    try {
      await apiRemoveTrackFromPlaylist(playlistId, trackId);
      await get().fetchPlaylists();
    } catch (error) {
      console.error('[PlaylistStore] removeTrack error:', error);
      await get().fetchPlaylists();
      throw error;
    }
  },

  updatePlaylistName: async (id, name) => {
    await apiUpdatePlaylist(id, { name });
    set({ playlists: get().playlists.map(p => p.id === id ? { ...p, name } : p) });
  },

  getTracks: async (id) => {
    return await getPlaylistTracks(id);
  },

  clear: () => set({ playlists: [], loading: false })
}));
