import React, { createContext, useCallback, useContext, useMemo, useState, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { usePlayback } from './PlaybackContext';
import { scanDeviceForAudio } from '../services/audioScanner';
import { saveCachedSongs, saveCachedSongsChunk } from '../services/libraryCache';
import { RemoteTrack } from '../types/music';

export type MusicState = {
  songs: ReturnType<typeof usePlayback>['songs'];
  scanning: boolean;
  isOffline: boolean;
  currentTrackId?: string | null;
  activeRemoteTrackId?: string | null;
  resolvingId: string | null;
  onScan: () => void;
  onPlayTrack: (track: RemoteTrack, queue?: RemoteTrack[], index?: number) => void;
  onPressSong: (id: string) => void;
};

const MusicStateContext = createContext<MusicState | null>(null);

export function MusicStateProvider({ children }: { children: React.ReactNode }) {
  const {
    songs,
    setSongs,
    playSong,
    playRemote,
    currentTrackId,
    activeRemoteTrack,
    isResolving,
    isOffline,
  } = usePlayback();

  const [scanning, setScanning] = useState(false);
  const lastChunkSaveRef = useRef(0);

  const handlePlayRemote = useCallback((track: RemoteTrack, queue?: RemoteTrack[], index?: number) => 
    playRemote(track, queue, index), [playRemote]);
  const handlePressSong = useCallback((id: string) => playSong(id), [playSong]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    const scanPerfStart = Date.now();
    
    try {
      const foundSongs = await scanDeviceForAudio({
        incrementalRefresh: true,
        chunkSize: 120,
        onChunk: chunkSongs => {
          InteractionManager.runAfterInteractions(() => {
            setSongs(chunkSongs);
          });

          const now = Date.now();
          if (now - lastChunkSaveRef.current > 1200) {
            lastChunkSaveRef.current = now;
            saveCachedSongsChunk(chunkSongs).catch(() => undefined);
          }
        },
      });
      InteractionManager.runAfterInteractions(() => {
        setSongs(foundSongs);
      });
      await saveCachedSongs(foundSongs);
    } catch (error) {
      console.error('[MusicState] scan error:', error);
    } finally {
      const elapsed = Date.now() - scanPerfStart;
      console.log(`[perf] scan:finish ${elapsed}ms`);
      setScanning(false);
    }
  }, [setSongs]);

  const state = useMemo(
    () => ({
      songs,
      scanning,
      isOffline,
      currentTrackId,
      activeRemoteTrackId: activeRemoteTrack?.id,
      resolvingId: isResolving ? activeRemoteTrack?.id ?? null : null,
      onScan: handleScan,
      onPlayTrack: handlePlayRemote,
      onPressSong: handlePressSong,
    }),
    [songs, scanning, isOffline, currentTrackId, activeRemoteTrack?.id, isResolving, handleScan, handlePlayRemote, handlePressSong],
  );

  return (
    <MusicStateContext.Provider value={state}>
      {children}
    </MusicStateContext.Provider>
  );
}

export function useMusicState() {
  const context = useContext(MusicStateContext);
  if (!context) {
    throw new Error('useMusicState must be used within MusicStateProvider');
  }
  return context;
}
