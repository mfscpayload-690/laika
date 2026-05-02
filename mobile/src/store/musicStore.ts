import { create } from 'zustand';
import { InteractionManager } from 'react-native';
import TrackPlayer, { Event, State, RepeatMode } from 'react-native-track-player';
import { ensureRemotePlayerReady } from '../hooks/remotePlayerSetup';
import { resolveTrack } from '../services/api';
import { ensureAudioPermission } from '../services/audioScanner';
import { loadCachedSongs, saveCachedSongs, saveCachedSongsChunk } from '../services/libraryCache';
import { logEvent } from '../services/eventLogger';
import { isTrackCached, getCachedTrackPath, cacheTrack } from '../services/cacheService';
import { scanDeviceForAudio } from '../services/audioScanner';
import type { LocalSong, RemoteTrack } from '../types/music';

type PlaybackMode = 'local' | 'remote' | 'none';
type RepeatSetting = 'off' | 'all' | 'one';

interface MusicState {
  // State
  songs: LocalSong[];
  mode: PlaybackMode;
  currentTrackId: string | null;
  activeRemoteTrack: RemoteTrack | null;
  playbackState: State;
  isReady: boolean;
  error: string | null;
  isShuffleEnabled: boolean;
  repeatMode: RepeatSetting;
  isResolving: boolean;
  isOffline: boolean;
  scanning: boolean;

  // Actions
  initialize: () => Promise<void>;
  setSongs: (songs: LocalSong[]) => void;
  playSong: (songId: string) => Promise<void>;
  playRemote: (track: RemoteTrack, queue?: RemoteTrack[], index?: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  previous: (forcePreviousTrack?: boolean) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeatMode: () => Promise<void>;
  startScan: () => Promise<void>;
}

const LOADING_STATES: State[] = [State.Buffering, State.Loading, State.Connecting];

export const useMusicStore = create<MusicState>((set, get) => {
  // Helper for logging
  const logPlayback = (action: 'play' | 'skip', track: any) => {
    logEvent({
      track_id: String(track.id),
      title: track.title,
      artist: track.artist || 'Unknown',
      thumbnail: track.artwork || track.thumbnail,
      source: track.source || (track.url?.startsWith('file') ? 'local' : 'remote'),
      action
    });
  };

  return {
    songs: [],
    mode: 'none',
    currentTrackId: null,
    activeRemoteTrack: null,
    playbackState: State.None,
    isReady: false,
    error: null,
    isShuffleEnabled: false,
    repeatMode: 'all',
    isResolving: false,
    isOffline: false,
    scanning: false,

    initialize: async () => {
      // 1. Load cached library
      const cached = await loadCachedSongs();
      if (cached.length > 0) {
        set({ songs: cached });
      }

      // 2. Setup Player
      await ensureAudioPermission();
      await ensureRemotePlayerReady();
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      
      const { state } = await TrackPlayer.getPlaybackState();
      set({ playbackState: state, isReady: true });

      // 3. Listen for Player Events
      TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
        set({ playbackState: state });
      });

      TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
        const activeTrack = await TrackPlayer.getActiveTrack();
        if (activeTrack) {
          set({ currentTrackId: String(activeTrack.id) });
        }
      });
      
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
        const { mode, repeatMode, activeRemoteTrack } = get();
        // Custom logic for remote queue ending can go here
      });
    },

    setSongs: (songs) => set({ songs }),

    playSong: async (songId) => {
      const { songs, mode } = get();
      set({ error: null, currentTrackId: songId, playbackState: State.Loading });

      try {
        const localTracks = songs.map(song => ({
          id: song.id,
          url: song.path,
          title: song.title,
          artist: song.artist,
          album: song.album,
          artwork: song.artwork,
          duration: song.duration > 0 ? song.duration / 1000 : undefined,
        }));

        let targetIndex = localTracks.findIndex(t => String(t.id) === songId);
        
        if (mode !== 'local') {
          const targetTrack = localTracks[targetIndex];
          if (targetTrack) {
            await TrackPlayer.reset();
            await TrackPlayer.add([targetTrack]);
            await TrackPlayer.play();
            set({ mode: 'local', activeRemoteTrack: null });

            // Add rest of library lazily
            InteractionManager.runAfterInteractions(async () => {
              const others = localTracks.filter(t => String(t.id) !== songId);
              await TrackPlayer.add(others);
            });
            
            logPlayback('play', targetTrack);
          }
        } else {
          if (targetIndex >= 0) {
            await TrackPlayer.skip(targetIndex);
            await TrackPlayer.play();
            logPlayback('play', localTracks[targetIndex]);
          }
        }
      } catch (e) {
        set({ error: 'Failed to play local song' });
      }
    },

    playRemote: async (track, queue = [], index = -1) => {
      set({ 
        isResolving: true, 
        error: null, 
        activeRemoteTrack: track, 
        playbackState: State.Loading,
        currentTrackId: track.id
      });

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
        
        logPlayback('play', track);
        set({ mode: 'remote', isOffline: false });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'Playback failed' });
        if (!(await isTrackCached(track.id))) set({ isOffline: true });
      } finally {
        set({ isResolving: false });
      }
    },

    togglePlayPause: async () => {
      const { playbackState } = get();
      if (playbackState === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    },

    next: async () => {
      const { mode, currentTrackId, songs } = get();
      // Simple next logic
      await TrackPlayer.skipToNext();
    },

    previous: async (forcePreviousTrack = false) => {
      const position = await TrackPlayer.getPosition();
      if (!forcePreviousTrack && position > 3) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    },

    toggleShuffle: async () => {
      const current = get().isShuffleEnabled;
      set({ isShuffleEnabled: !current });
      // In production, we would actually shuffle the TrackPlayer queue here
    },

    cycleRepeatMode: async () => {
      const current = get().repeatMode;
      const next: RepeatSetting = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
      const nativeMode = next === 'off' ? RepeatMode.Off : next === 'all' ? RepeatMode.Queue : RepeatMode.Track;
      await TrackPlayer.setRepeatMode(nativeMode);
      set({ repeatMode: next });
    },

    startScan: async () => {
      set({ scanning: true });
      try {
        const foundSongs = await scanDeviceForAudio({
          incrementalRefresh: true,
          chunkSize: 120,
          onChunk: chunkSongs => {
            set({ songs: chunkSongs });
            saveCachedSongsChunk(chunkSongs).catch(() => undefined);
          },
        });
        set({ songs: foundSongs });
        await saveCachedSongs(foundSongs);
      } catch (error) {
        console.error('[MusicStore] scan error:', error);
      } finally {
        set({ scanning: false });
      }
    }
  };
});
