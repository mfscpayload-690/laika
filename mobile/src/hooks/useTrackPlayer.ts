import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import TrackPlayer, {
  Event,
  RepeatMode,
  State,
  Track,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import type {LocalSong} from '../types/music';
import {ensureRemotePlayerReady} from './remotePlayerSetup';

function toTrack(song: LocalSong): Track {
  return {
    id: song.id,
    url: song.path,
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.artwork,
    duration: song.duration > 0 ? song.duration / 1000 : undefined,
  };
}

const LOADING_STATES: State[] = [State.Buffering, State.Loading, State.Connecting];

export function useTrackPlayer(songs: LocalSong[]) {
  const [isReady, setIsReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<State>(State.None);
  const [currentTrackId, setCurrentTrackId] = useState<string | undefined>();
  const hasLoadedQueue = useRef(false);

  const tracks = useMemo(() => songs.map(toTrack), [songs]);

  // Setup player once using the shared singleton guard
  useEffect(() => {
    let mounted = true;

    ensureRemotePlayerReady()
      .then(async () => {
        await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        const state = await TrackPlayer.getPlaybackState();
        if (mounted) {
          setPlaybackState(state.state);
          setIsReady(true);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  // Load queue when ready and songs change
  useEffect(() => {
    if (!isReady || tracks.length === 0) {
      return;
    }

    const loadQueue = async () => {
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      hasLoadedQueue.current = true;
    };

    loadQueue().catch(() => undefined);
  }, [isReady, tracks]);

  // Sync state via events
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
    },
  );

  const play = useCallback(async () => {
    if (!hasLoadedQueue.current) {
      return;
    }
    await TrackPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    const {state} = await TrackPlayer.getPlaybackState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      if (!hasLoadedQueue.current) {
        return;
      }
      await TrackPlayer.play();
    }
  }, []);

  const next = useCallback(async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      if (tracks.length > 0) {
        await TrackPlayer.skip(0);
      }
    }
  }, [tracks.length]);

  const previous = useCallback(async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      await TrackPlayer.seekTo(0);
    }
  }, []);

  const playSong = useCallback(
    async (songId: string) => {
      if (!hasLoadedQueue.current) {
        return;
      }

      const index = tracks.findIndex(track => String(track.id) === songId);
      if (index < 0) {
        return;
      }

      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    },
    [tracks],
  );

  return {
    isReady,
    currentTrackId,
    isPlaying: playbackState === State.Playing,
    isLoading: LOADING_STATES.includes(playbackState),
    playbackState,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    playSong,
  };
}
