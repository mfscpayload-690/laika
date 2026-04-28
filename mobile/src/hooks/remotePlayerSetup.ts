import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';

// Shared singleton setup guard — ensures setupPlayer is called at most once
// across both useTrackPlayer and useRemotePlayer.
let setupPromise: Promise<void> | null = null;

export async function ensureRemotePlayerReady(): Promise<void> {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    try {
      await TrackPlayer.setupPlayer();
    } catch {
      // Already initialized — safe to continue.
    }

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
  })();

  return setupPromise;
}
