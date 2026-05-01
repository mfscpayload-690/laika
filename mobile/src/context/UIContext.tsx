import React, { createContext, useContext, useState } from 'react';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import type { LocalSong, RemoteTrack } from '../types/music';

interface UIContextType {
  showAddToPlaylist: (track: LocalSong | RemoteTrack) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<LocalSong | RemoteTrack | null>(null);

  const showAddToPlaylist = (track: LocalSong | RemoteTrack) => {
    setSelectedTrack(track);
    setPlaylistModalVisible(true);
  };

  return (
    <UIContext.Provider value={{ showAddToPlaylist }}>
      {children}
      <AddToPlaylistModal 
        visible={playlistModalVisible} 
        onClose={() => setPlaylistModalVisible(false)} 
        track={selectedTrack} 
      />
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
