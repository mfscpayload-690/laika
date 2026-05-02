import { create } from 'zustand';
import { getLikes, likeTrack, unlikeTrack, type LikedTrack } from '../services/libraryService';
import { LocalSong, RemoteTrack } from '../types/music';

interface LikesState {
  likedTrackIds: Set<string>;
  likedTracks: LikedTrack[];
  isLoading: boolean;
  
  // Actions
  fetchLikes: () => Promise<void>;
  toggleLike: (track: LocalSong | RemoteTrack) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  clear: () => void;
}

export const useLikesStore = create<LikesState>((set, get) => ({
  likedTrackIds: new Set(),
  likedTracks: [],
  isLoading: false,

  fetchLikes: async () => {
    set({ isLoading: true });
    try {
      const tracks = await getLikes();
      set({ 
        likedTracks: tracks, 
        likedTrackIds: new Set(tracks.map(t => t.track_id)),
        isLoading: false 
      });
    } catch (e) {
      console.warn('[LikesStore] Failed to load likes:', e);
      set({ isLoading: false });
    }
  },

  toggleLike: async (track) => {
    const { likedTrackIds } = get();
    const trackId = track.id;
    const alreadyLiked = likedTrackIds.has(trackId);

    // Optimistic Update
    const nextIds = new Set(likedTrackIds);
    if (alreadyLiked) {
      nextIds.delete(trackId);
      set({ 
        likedTrackIds: nextIds,
        likedTracks: get().likedTracks.filter(t => t.track_id !== trackId)
      });
    } else {
      nextIds.add(trackId);
      set({ likedTrackIds: nextIds });
    }

    try {
      if (alreadyLiked) {
        await unlikeTrack(trackId);
      } else {
        await likeTrack(track);
        // Refresh to get full metadata from DB
        await get().fetchLikes();
      }
    } catch (e) {
      console.warn('[LikesStore] toggleLike failed, reverting:', e);
      await get().fetchLikes();
    }
  },

  isLiked: (trackId) => get().likedTrackIds.has(trackId),

  clear: () => set({ likedTrackIds: new Set(), likedTracks: [] })
}));
