import { createContext, useContext } from 'react';
import { RemoteTrack } from '../types/music';
import { usePlayback } from '../context/PlaybackContext';

export type TabNavigatorState = {
  songs: ReturnType<typeof usePlayback>['songs'];
  scanning: boolean;
  isOffline: boolean;
  currentTrackId?: string;
  activeRemoteTrackId?: string | null;
  resolvingId: string | null;
  onScan: () => void;
  onPlayTrack: (track: RemoteTrack) => void;
  onPressSong: (id: string) => void;
};

export const TabNavigatorStateContext = createContext<TabNavigatorState | null>(null);

export function useTabNavigatorState() {
  const context = useContext(TabNavigatorStateContext);
  if (!context) {
    throw new Error('useTabNavigatorState must be used within TabNavigatorStateContext');
  }
  return context;
}
