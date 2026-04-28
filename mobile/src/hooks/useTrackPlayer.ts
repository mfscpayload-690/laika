import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  Track,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import type {LocalSong} from '../types/music';

function toTrack(song: LocalSong): Track {
  return {
    id: song.id,
    url: song.path,
    title: song.title,
    artist: song.artist,
  };
}

export function useTrackPlayer(songs: LocalSong[]) {
  const [isReady, setIsReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<State>(State.None);
  const [currentTrackId, setCurrentTrackId] = useState<string | undefined>();
  const hasLoadedQueue = useRef(false);

  const tracks = useMemo(() => songs.map(toTrack), [songs]);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      });
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);

      const state = await TrackPlayer.getPlaybackState();
      setPlaybackState(state.state);

      if (mounted) {
        setIsReady(true);
      }
    };

    setup().catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const loadQueue = async () => {
      if (!isReady || tracks.length === 0) {
        return;
      }

      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      hasLoadedQueue.current = true;
    };

    loadQueue().catch(() => undefined);
  }, [isReady, tracks]);

  useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackActiveTrackChanged], async event => {
    if (event.type === Event.PlaybackState) {
      setPlaybackState(event.state);
    }

    if (event.type === Event.PlaybackActiveTrackChanged) {
      const activeTrack = await TrackPlayer.getActiveTrack();
      setCurrentTrackId(activeTrack?.id ? String(activeTrack.id) : undefined);
    }
  });

  const play = useCallback(async () => {
    if (!hasLoadedQueue.current) {
      return;
    }

    await TrackPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
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
    play,
    pause,
    next,
    previous,
    playSong,
  };
}
