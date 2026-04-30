import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import TrackPlayer, { Event, State, useTrackPlayerEvents, RepeatMode } from 'react-native-track-player';
import { ensureRemotePlayerReady } from '../hooks/remotePlayerSetup';
import { resolveTrack } from '../services/api';
import { ensureAudioPermission } from '../services/audioScanner';
import { loadCachedSongs } from '../services/libraryCache';
import { logEvent } from '../services/eventLogger';
import type { LocalSong, RemoteTrack } from '../types/music';

type PlaybackMode = 'local' | 'remote' | 'none';
type RepeatSetting = 'off' | 'all' | 'one';

interface PlaybackContextType {
  mode: PlaybackMode;
  currentTrackId?: string;
  activeRemoteTrack: RemoteTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  isShuffleEnabled: boolean;
  repeatMode: RepeatSetting;
  isResolving: boolean;

  // Actions
  playSong: (songId: string) => Promise<void>;
  playRemote: (track: RemoteTrack) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  previous: (forcePreviousTrack?: boolean) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeatMode: () => Promise<void>;

  // Library state (shared for convenience)
  songs: LocalSong[];
  setSongs: (songs: LocalSong[]) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

const LOADING_STATES: State[] = [State.Buffering, State.Loading, State.Connecting];

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<LocalSong[]>([]);
  const [mode, setMode] = useState<PlaybackMode>('none');
  const [isReady, setIsReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<State>(State.None);
  const [currentTrackId, setCurrentTrackId] = useState<string | undefined>();
  const [activeRemoteTrack, setActiveRemoteTrack] = useState<RemoteTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatSetting>('all');
  const lastLoggedTrackRef = useRef<{track_id: string, title: string, artist: string, thumbnail?: string, source?: string} | null>(null);

  const hasLoadedLocalQueue = useRef(false);

  const localTracks = useMemo(() => songs.map(song => ({
    id: song.id,
    url: song.path,
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.artwork,
    duration: song.duration > 0 ? song.duration / 1000 : undefined,
  })), [songs]);

  const shuffleTracks = useCallback(
    <T,>(input: T[]) => {
      const copy = [...input];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    [],
  );

  // Setup
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const cached = await loadCachedSongs();
      if (cached.length > 0) {setSongs(cached);}

      await ensureAudioPermission();
      await ensureRemotePlayerReady();

      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      const state = await TrackPlayer.getPlaybackState();

      if (mounted) {
        setPlaybackState(state.state);
        setIsReady(true);
      }
    };

    init().catch(() => undefined);

    return () => { mounted = false; };
  }, []);

  // Events
  useTrackPlayerEvents(
    [Event.PlaybackState, Event.PlaybackActiveTrackChanged],
    async event => {
      if (event.type === Event.PlaybackState) {
        setPlaybackState(event.state);
      }
      if (event.type === Event.PlaybackActiveTrackChanged) {
        const activeTrack = await TrackPlayer.getActiveTrack();
        setCurrentTrackId(activeTrack?.id ? String(activeTrack.id) : undefined);
      }
    }
  );

  const playSong = useCallback(async (songId: string) => {
    setError(null);
    setCurrentTrackId(songId);
    setPlaybackState(State.Loading);
    try {
      let targetIndex = localTracks.findIndex(t => String(t.id) === songId);

      if (mode !== 'local' || !hasLoadedLocalQueue.current) {
        await TrackPlayer.reset();
        await TrackPlayer.add(localTracks);
        hasLoadedLocalQueue.current = true;
        setMode('local');
        setActiveRemoteTrack(null);
        setIsShuffleEnabled(false); // Reset shuffle when a new local queue is loaded
      } else {
        // If the queue is already loaded (and potentially shuffled), find the index in the actual queue
        const currentQueue = await TrackPlayer.getQueue();
        targetIndex = currentQueue.findIndex(t => String(t.id) === songId);
      }

      if (targetIndex >= 0) {
        await TrackPlayer.skip(targetIndex);
        await TrackPlayer.play();
        
        const track = localTracks[targetIndex];
        lastLoggedTrackRef.current = { track_id: String(track.id), title: track.title, artist: track.artist || 'Unknown', thumbnail: track.artwork, source: 'local' };
        logEvent({
          ...lastLoggedTrackRef.current,
          action: 'play'
        });
      }
    } catch (e) {
      setError('Failed to play local song');
    }
  }, [localTracks, mode]);

  const playRemote = useCallback(async (track: RemoteTrack) => {
    setIsResolving(true);
    setError(null);
    setActiveRemoteTrack(track);
    setPlaybackState(State.Loading);
    try {
      // UX Fix: Stop old playback immediately while resolving new metadata
      await TrackPlayer.reset();
      const resolved = await resolveTrack(track.title, track.artist, track.duration_ms);
      await TrackPlayer.add({
        id: track.id,
        url: resolved.url,
        title: resolved.title ?? track.title,
        artist: track.artist,
        artwork: track.thumbnail,
        duration: resolved.duration / 1000,
      });
      await TrackPlayer.play();

      lastLoggedTrackRef.current = { track_id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail, source: track.source };
      logEvent({
        ...lastLoggedTrackRef.current,
        action: 'play'
      });

      setMode('remote');
      setActiveRemoteTrack(track);
      hasLoadedLocalQueue.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Playback failed');
    } finally {
      setIsResolving(false);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    // Optimistic update for instant UI feedback
    setPlaybackState(prev => prev === State.Playing ? State.Paused : State.Playing);
    
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, []);

  const next = useCallback(async () => {
    // Log skip event before moving
    if (lastLoggedTrackRef.current && playbackState === State.Playing) {
      logEvent({
        ...lastLoggedTrackRef.current,
        action: 'skip'
      });
    }

    if (mode === 'local') {
      try {
        const queue = await TrackPlayer.getQueue();
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        
        if (activeIndex !== undefined && activeIndex !== null && queue.length > 0) {
          const nextIndex = activeIndex + 1 < queue.length ? activeIndex + 1 : 0;
          setCurrentTrackId(String(queue[nextIndex].id));
          
          const nextTrack = queue[nextIndex];
          lastLoggedTrackRef.current = { track_id: String(nextTrack.id), title: nextTrack.title || 'Unknown', artist: nextTrack.artist || 'Unknown', thumbnail: nextTrack.artwork, source: mode === 'local' ? 'local' : 'remote' };
          logEvent({ 
            ...lastLoggedTrackRef.current, 
            action: 'play'
          });
        }
        await TrackPlayer.skipToNext();
      } catch (err) {
        console.warn('PlaybackContext: next failed', err);
        // Fallback: if skipToNext fails, try to jump to the first track
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          setCurrentTrackId(String(queue[0].id));
          await TrackPlayer.skip(0);

          const nextTrack = queue[0];
          lastLoggedTrackRef.current = { track_id: String(nextTrack.id), title: nextTrack.title || 'Unknown', artist: nextTrack.artist || 'Unknown', thumbnail: nextTrack.artwork, source: mode === 'local' ? 'local' : 'remote' };
          logEvent({ 
            ...lastLoggedTrackRef.current, 
            action: 'play'
          });
        }
      }
    }
  }, [mode, playbackState]);

  const previous = useCallback(async (forcePreviousTrack: boolean = false) => {
    // Log skip event before moving backwards
    if (lastLoggedTrackRef.current && playbackState === State.Playing) {
      logEvent({
        ...lastLoggedTrackRef.current,
        action: 'skip'
      });
    }

    if (mode === 'local') {
      try {
        const queue = await TrackPlayer.getQueue();
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        const position = await TrackPlayer.getPosition();
        
        if (activeIndex !== undefined && activeIndex !== null && queue.length > 0) {
          // Standard behavior: if > 3s into song, previous just restarts current song
          // If forcePreviousTrack is true (like from a swipe), we bypass this check.
          if (!forcePreviousTrack && position > 3) {
            await TrackPlayer.seekTo(0);
            return;
          }
          
          const prevIndex = activeIndex - 1 >= 0 ? activeIndex - 1 : 0;
          setCurrentTrackId(String(queue[prevIndex].id));

          const prevTrack = queue[prevIndex];
          lastLoggedTrackRef.current = { track_id: String(prevTrack.id), title: prevTrack.title || 'Unknown', artist: prevTrack.artist || 'Unknown', thumbnail: prevTrack.artwork, source: mode === 'local' ? 'local' : 'remote' };
          logEvent({ 
            ...lastLoggedTrackRef.current, 
            action: 'play'
          });
        }
        await TrackPlayer.skipToPrevious();
      } catch (err) {
        console.warn('PlaybackContext: previous failed', err);
        await TrackPlayer.seekTo(0);
      }
    } else {
      await TrackPlayer.seekTo(0);
    }
  }, [mode, playbackState]);

  const toggleShuffle = useCallback(async () => {
    if (mode !== 'local' || localTracks.length <= 1) {
      setIsShuffleEnabled(prev => !prev);
      return;
    }

    try {
      const activeTrack = await TrackPlayer.getActiveTrack();
      const activeId = activeTrack?.id ? String(activeTrack.id) : undefined;

      if (!activeId) {
        setIsShuffleEnabled(prev => !prev);
        return;
      }

      const baseTracks = [...localTracks];
      const currentTrack = baseTracks.find(track => String(track.id) === activeId);
      const remainingTracks = baseTracks.filter(track => String(track.id) !== activeId);

      const nextShuffleEnabled = !isShuffleEnabled;
      const orderedRemaining = nextShuffleEnabled
        ? shuffleTracks(remainingTracks)
        : remainingTracks;
      const rebuiltQueue = currentTrack ? [currentTrack, ...orderedRemaining] : orderedRemaining;

      if (rebuiltQueue.length === 0) {
        return;
      }

      await TrackPlayer.reset();
      await TrackPlayer.add(rebuiltQueue);
      await TrackPlayer.skip(0);
      if (playbackState === State.Playing) {
        await TrackPlayer.play();
      }
      setIsShuffleEnabled(nextShuffleEnabled);
      hasLoadedLocalQueue.current = true;
    } catch {
      setError('Failed to update shuffle');
    }
  }, [isShuffleEnabled, localTracks, mode, playbackState, shuffleTracks]);

  const cycleRepeatMode = useCallback(async () => {
    try {
      const nextMode: RepeatSetting =
        repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';

      const nativeMode =
        nextMode === 'off'
          ? RepeatMode.Off
          : nextMode === 'all'
            ? RepeatMode.Queue
            : RepeatMode.Track;

      await TrackPlayer.setRepeatMode(nativeMode);
      setRepeatMode(nextMode);
    } catch {
      setError('Failed to update repeat mode');
    }
  }, [repeatMode]);

  const value = {
    mode,
    currentTrackId,
    activeRemoteTrack,
    isPlaying: playbackState === State.Playing,
    isLoading: LOADING_STATES.includes(playbackState) || isResolving,
    isReady,
    error,
    isShuffleEnabled,
    repeatMode,
    isResolving,
    playSong,
    playRemote,
    togglePlayPause,
    next,
    previous,
    toggleShuffle,
    cycleRepeatMode,
    songs,
    setSongs,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}
