import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import TrackPlayer, { Event, State, useTrackPlayerEvents, RepeatMode } from 'react-native-track-player';
import { ensureRemotePlayerReady } from '../hooks/remotePlayerSetup';
import { resolveTrack } from '../services/api';
import { ensureAudioPermission } from '../services/audioScanner';
import { loadCachedSongs } from '../services/libraryCache';
import { logEvent } from '../services/eventLogger';
import { isTrackCached, getCachedTrackPath, cacheTrack } from '../services/cacheService';
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
  isOffline: boolean;

  // Actions
  // Actions
  playSong: (songId: string) => Promise<void>;
  playRemote: (track: RemoteTrack, queue?: RemoteTrack[], index?: number) => Promise<void>;
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
  const [isOffline, setIsOffline] = useState(false);
  
  // Remote Queue State
  const [remoteQueue, setRemoteQueue] = useState<RemoteTrack[]>([]);
  const [remoteIndex, setRemoteIndex] = useState(-1);

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
      if (cached.length > 0) {
        setSongs(cached);
      }

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
    [Event.PlaybackState, Event.PlaybackActiveTrackChanged, Event.PlaybackQueueEnded],
    async event => {
      if (event.type === Event.PlaybackState) {
        setPlaybackState(event.state);
      }
      if (event.type === Event.PlaybackActiveTrackChanged) {
        const activeTrack = await TrackPlayer.getActiveTrack();
        if (activeTrack) {
          setCurrentTrackId(String(activeTrack.id));
        }
      }
      if (event.type === Event.PlaybackQueueEnded) {
        // Auto-next for remote queue if applicable
        if (mode === 'remote' && remoteQueue.length > 0) {
          const nextIdx = remoteIndex + 1;
          if (nextIdx < remoteQueue.length) {
            playRemote(remoteQueue[nextIdx], remoteQueue, nextIdx);
          } else if (repeatMode === 'all') {
            playRemote(remoteQueue[0], remoteQueue, 0);
          }
        }
      }
    },
  );

  const playSong = useCallback(async (songId: string) => {
    setError(null);
    setCurrentTrackId(songId);
    setPlaybackState(State.Loading);
    try {
      let targetIndex = localTracks.findIndex(t => String(t.id) === songId);

      if (mode !== 'local' || !hasLoadedLocalQueue.current) {
        const targetTrack = localTracks[targetIndex];
        if (targetTrack) {
          await TrackPlayer.reset();
          await TrackPlayer.add([targetTrack]);
          await TrackPlayer.play();
          setMode('local');
          setActiveRemoteTrack(null);
          setRemoteQueue([]);
          setRemoteIndex(-1);

          InteractionManager.runAfterInteractions(async () => {
            const others = localTracks.filter(t => String(t.id) !== songId);
            await TrackPlayer.add(others);
            hasLoadedLocalQueue.current = true;
          });
        }
      } else {
        if (targetIndex >= 0) {
          await TrackPlayer.skip(targetIndex);
          await TrackPlayer.play();
        }
      }

      if (targetIndex >= 0) {
        const track = localTracks[targetIndex];
        lastLoggedTrackRef.current = { track_id: String(track.id), title: track.title, artist: track.artist || 'Unknown', thumbnail: track.artwork, source: 'local' };
        logEvent({
          ...lastLoggedTrackRef.current,
          action: 'play',
        });
      }
    } catch (e) {
      setError('Failed to play local song');
    }
  }, [localTracks, mode]);

  const playRemote = useCallback(async (track: RemoteTrack, queue: RemoteTrack[] = [], index: number = -1) => {
    setIsResolving(true);
    setError(null);
    setActiveRemoteTrack(track);
    setPlaybackState(State.Loading);
    
    // Update queue state
    if (queue.length > 0) {
      setRemoteQueue(queue);
      setRemoteIndex(index !== -1 ? index : queue.findIndex(t => t.id === track.id));
    } else {
      setRemoteQueue([track]);
      setRemoteIndex(0);
    }

    try {
      await TrackPlayer.reset();

      const cached = await isTrackCached(track.id);
      let streamUrl: string;

      if (cached) {
        streamUrl = 'file://' + getCachedTrackPath(track.id);
      } else {
        const resolved = await resolveTrack(track.title, track.artist, track.duration_ms);
        streamUrl = resolved.url;
        cacheTrack(track.id, resolved.url).catch(() => undefined);
      }

      await TrackPlayer.add({
        id: track.id,
        url: streamUrl,
        title: track.title,
        artist: track.artist,
        artwork: track.thumbnail,
        duration: track.duration_ms / 1000,
      });
      await TrackPlayer.play();

      lastLoggedTrackRef.current = { track_id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail, source: track.source };
      logEvent({ ...lastLoggedTrackRef.current, action: 'play' });

      setMode('remote');
      setCurrentTrackId(track.id);
      hasLoadedLocalQueue.current = false;
      setIsOffline(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Playback failed');
      if (!(await isTrackCached(track.id))) setIsOffline(true);
    } finally {
      setIsResolving(false);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    setPlaybackState(prev => prev === State.Playing ? State.Paused : State.Playing);
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Playing) await TrackPlayer.pause();
    else await TrackPlayer.play();
  }, []);

  const next = useCallback(async () => {
    if (lastLoggedTrackRef.current && playbackState === State.Playing) {
      logEvent({ ...lastLoggedTrackRef.current, action: 'skip' });
    }

    if (mode === 'local') {
      try {
        const queue = await TrackPlayer.getQueue();
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        if (activeIndex !== undefined && activeIndex !== null && queue.length > 0) {
          const nextIndex = activeIndex + 1 < queue.length ? activeIndex + 1 : 0;
          setCurrentTrackId(String(queue[nextIndex].id));
        }
        await TrackPlayer.skipToNext();
      } catch (err) {
        console.warn('PlaybackContext: next failed', err);
      }
    } else if (mode === 'remote' && remoteQueue.length > 0) {
      const nextIndex = remoteIndex + 1 < remoteQueue.length ? remoteIndex + 1 : 0;
      await playRemote(remoteQueue[nextIndex], remoteQueue, nextIndex);
    }
  }, [mode, playbackState, remoteQueue, remoteIndex, playRemote]);

  const previous = useCallback(async (forcePreviousTrack: boolean = false) => {
    if (lastLoggedTrackRef.current && playbackState === State.Playing) {
      logEvent({ ...lastLoggedTrackRef.current, action: 'skip' });
    }

    if (mode === 'local') {
      try {
        const queue = await TrackPlayer.getQueue();
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        const position = await TrackPlayer.getPosition();

        if (activeIndex !== undefined && activeIndex !== null && queue.length > 0) {
          if (!forcePreviousTrack && position > 3) {
            await TrackPlayer.seekTo(0);
            return;
          }
          const prevIndex = activeIndex - 1 >= 0 ? activeIndex - 1 : 0;
          setCurrentTrackId(String(queue[prevIndex].id));
        }
        await TrackPlayer.skipToPrevious();
      } catch (err) {
        console.warn('PlaybackContext: previous failed', err);
        await TrackPlayer.seekTo(0);
      }
    } else if (mode === 'remote' && remoteQueue.length > 0) {
      const position = await TrackPlayer.getPosition();
      if (!forcePreviousTrack && position > 3) {
        await TrackPlayer.seekTo(0);
      } else {
        const prevIndex = remoteIndex - 1 >= 0 ? remoteIndex - 1 : remoteQueue.length - 1;
        await playRemote(remoteQueue[prevIndex], remoteQueue, prevIndex);
      }
    } else {
      await TrackPlayer.seekTo(0);
    }
  }, [mode, playbackState, remoteQueue, remoteIndex, playRemote]);

  const toggleShuffle = useCallback(async () => {
    if (mode === 'local') {
      try {
        const activeTrack = await TrackPlayer.getActiveTrack();
        const activeId = activeTrack?.id ? String(activeTrack.id) : undefined;
        if (!activeId) { setIsShuffleEnabled(prev => !prev); return; }

        const baseTracks = [...localTracks];
        const currentTrack = baseTracks.find(track => String(track.id) === activeId);
        const remainingTracks = baseTracks.filter(track => String(track.id) !== activeId);

        const nextShuffleEnabled = !isShuffleEnabled;
        const orderedRemaining = nextShuffleEnabled ? shuffleTracks(remainingTracks) : remainingTracks;
        const rebuiltQueue = currentTrack ? [currentTrack, ...orderedRemaining] : orderedRemaining;

        await TrackPlayer.reset();
        await TrackPlayer.add(rebuiltQueue);
        await TrackPlayer.skip(0);
        if (playbackState === State.Playing) await TrackPlayer.play();
        setIsShuffleEnabled(nextShuffleEnabled);
      } catch {
        setError('Failed to update shuffle');
      }
    } else {
      // Toggle shuffle for remote queue
      const nextShuffle = !isShuffleEnabled;
      setIsShuffleEnabled(nextShuffle);
      if (nextShuffle && remoteQueue.length > 0) {
        const current = remoteQueue[remoteIndex];
        const others = remoteQueue.filter((_, i) => i !== remoteIndex);
        setRemoteQueue([current, ...shuffleTracks(others)]);
        setRemoteIndex(0);
      }
    }
  }, [isShuffleEnabled, localTracks, mode, playbackState, shuffleTracks, remoteQueue, remoteIndex]);

  const cycleRepeatMode = useCallback(async () => {
    try {
      const nextMode: RepeatSetting = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
      const nativeMode = nextMode === 'off' ? RepeatMode.Off : nextMode === 'all' ? RepeatMode.Queue : RepeatMode.Track;
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
    isOffline,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error('usePlayback must be used within a PlaybackProvider');
  return context;
}
