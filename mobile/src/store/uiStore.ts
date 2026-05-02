import { create } from 'zustand';
import type { LocalSong, RemoteTrack } from '../types/music';

interface UIState {
  playlistModalVisible: boolean;
  selectedTrack: LocalSong | RemoteTrack | null;
  
  // Actions
  showAddToPlaylist: (track: LocalSong | RemoteTrack) => void;
  hideAddToPlaylist: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  playlistModalVisible: false,
  selectedTrack: null,

  showAddToPlaylist: (track) => {
    set({ selectedTrack: track, playlistModalVisible: true });
  },
  
  hideAddToPlaylist: () => {
    set({ selectedTrack: null, playlistModalVisible: false });
  },
}));
