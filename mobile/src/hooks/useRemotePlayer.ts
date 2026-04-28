import {useCallback, useEffect, useRef, useState} from 'react';
import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import {resolveTrack} from '../services/api';
import type {RemoteTrack} from '../types/music';

// Mirrors useTrackPlayer's setup guard — remote player reuses the same instance.
// Import the guard from useTrackPlayer so we never call setupPlayer twice.
import {ensureRemotePlayerReady} from './remotePlayerSetup';

type RemoteStatus = 'idle' | 'resolving' | 'playing' | 'paused' | 'loading' | 'error';

const LOADING_STATES: State[] = [State.Buffering, State.Loading, State.Connecting];

export function useRemotePlayer() {
  const [status, setStatus] = useState<RemoteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activeTrack, setActiveTrack] = useState<RemoteTrack | null>(null);
  // Track whether this hook "owns" the current TrackPlayer queue
  const isOwner = useRef(false);

  // Sync playback state when this hook owns the queue
  useTrackPlayerEvents([Event.PlaybackState], event => {
    if (!isOwner.current) {
      return;
    }

    if (event.type === Event.PlaybackState) {
      if (LOADING_STATES.includes(event.state)) {
        setStatus('loading');
      } else if (event.state === State.Playing) {
        setStatus('playing');
      } else if (event.state === State.Paused || event.state === State.Stopped) {
        setStatus('paused');
      }
    }
  });

  const play = useCallback(async (track: RemoteTrack) => {
    setStatus('resolving');
    setError(null);
    isOwner.current = true;

    try {
      await ensureRemotePlayerReady();

      const resolved = await resolveTrack(track.title, track.artist, track.duration_ms);

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.id,
        url: resolved.url,
        title: resolved.title ?? track.title,
        artist: track.artist,
        artwork: track.thumbnail,
        duration: resolved.duration / 1000,
      });
      await TrackPlayer.play();

      setActiveTrack(track);
      setStatus('loading'); // will transition to 'playing' via event
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Playback failed';
      setError(msg);
      setStatus('error');
      isOwner.current = false;
    }
  }, []);

  const pause = useCallback(async () => {
    if (!isOwner.current) {
      return;
    }
    await TrackPlayer.pause();
  }, []);

  const resume = useCallback(async () => {
    if (!isOwner.current) {
      return;
    }
    await TrackPlayer.play();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!isOwner.current) {
      return;
    }
    const {state} = await TrackPlayer.getPlaybackState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, []);

  const stop = useCallback(async () => {
    if (!isOwner.current) {
      return;
    }
    await TrackPlayer.reset();
    isOwner.current = false;
    setStatus('idle');
    setActiveTrack(null);
    setError(null);
  }, []);

  return {
    status,
    error,
    activeTrack,
    isPlaying: status === 'playing',
    isLoading: status === 'resolving' || status === 'loading',
    play,
    pause,
    resume,
    togglePlayPause,
    stop,
  };
}
