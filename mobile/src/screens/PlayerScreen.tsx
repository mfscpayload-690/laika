import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Pressable,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pause, Play, SkipBack, SkipForward, Shuffle, Repeat, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import TrackPlayer from 'react-native-track-player';

import { colors, radii, spacing, typography } from '../theme';

type PlayerScreenProps = {
  currentTitle: string;
  currentArtist: string;
  currentAlbum?: string;
  currentPath?: string;
  currentThumbnail?: string;
  queueSize: number;
  currentIndex: number;
  isReady: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  isShuffleEnabled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onCycleRepeatMode: () => void;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayerScreen({
  currentTitle,
  currentArtist,
  currentAlbum,
  currentPath,
  currentThumbnail,
  queueSize: _queueSize,
  currentIndex: _currentIndex,
  isReady,
  isPlaying,
  isLoading,
  isShuffleEnabled,
  repeatMode,
  onTogglePlayPause,
  onNext,
  onPrevious,
  onToggleShuffle,
  onCycleRepeatMode,
}: PlayerScreenProps) {
  const navigation = useNavigation();
  const hasTrack = Boolean(currentPath);
  const canControl = isReady && hasTrack;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  const waveformBars = useMemo(() => {
    const source = `${currentTitle}-${currentArtist}-${currentPath ?? 'local'}`;
    let seed = 0;
    for (let index = 0; index < source.length; index += 1) {
      seed = (seed * 31 + source.charCodeAt(index)) % 2147483647;
    }

    const bars: number[] = [];
    let nextSeed = seed || 1;
    for (let index = 0; index < 56; index += 1) {
      nextSeed = (nextSeed * 48271) % 2147483647;
      bars.push((nextSeed % 1000) / 1000);
    }
    return bars;
  }, [currentArtist, currentPath, currentTitle]);

  const waveformBarHeights = useMemo(
    () =>
      waveformBars.map(value => ({
        height: 6 + Math.round(value * 20),
      })),
    [waveformBars],
  );

  // Pulse animation on play state change
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isPlaying ? 1.02 : 1.0,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [isPlaying, scaleAnim]);

  // Poll progress unless user is actively scrubbing.
  useEffect(() => {
    if (!canControl || isScrubbing) {
      return;
    }

    const interval = setInterval(() => {
      TrackPlayer.getProgress()
        .then(p => setProgress(p))
        .catch(() => undefined);
    }, 250);

    return () => clearInterval(interval);
  }, [canControl, isScrubbing]);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const ratioToPosition = useCallback(
    (ratio: number) => ratio * progress.duration,
    [progress.duration],
  );

  const xToRatio = useCallback(
    (x: number) => {
      if (barWidth <= 0) {
        return 0;
      }
      return clamp(x / barWidth, 0, 1);
    },
    [barWidth],
  );

  const handleWaveformLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const handleSeekFromX = useCallback(
    (x: number) => {
      if (!canControl || barWidth === 0 || progress.duration === 0) {
        return;
      }
      const ratio = xToRatio(x);
      setScrubPosition(ratioToPosition(ratio));
    },
    [barWidth, canControl, progress.duration, ratioToPosition, xToRatio],
  );

  const commitSeek = useCallback(
    (x: number) => {
      if (!canControl || barWidth === 0 || progress.duration === 0) {
        setIsScrubbing(false);
        return;
      }
      const ratio = xToRatio(x);
      const seekPosition = ratioToPosition(ratio);
      setProgress(prev => ({...prev, position: seekPosition}));
      setScrubPosition(seekPosition);
      TrackPlayer.seekTo(seekPosition).catch(() => undefined);
      setIsScrubbing(false);
    },
    [barWidth, canControl, progress.duration, ratioToPosition, xToRatio],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canControl,
        onMoveShouldSetPanResponder: () => canControl,
        onPanResponderGrant: event => {
          setIsScrubbing(true);
          handleSeekFromX(event.nativeEvent.locationX);
        },
        onPanResponderMove: event => {
          handleSeekFromX(event.nativeEvent.locationX);
        },
        onPanResponderRelease: event => {
          commitSeek(event.nativeEvent.locationX);
        },
        onPanResponderTerminate: event => {
          commitSeek(event.nativeEvent.locationX);
        },
      }),
    [canControl, commitSeek, handleSeekFromX],
  );

  const displayPosition = isScrubbing ? scrubPosition : progress.position;
  const progressRatio =
    progress.duration > 0 ? clamp(displayPosition / progress.duration, 0, 1) : 0;
  const activeBarCount = Math.round(progressRatio * waveformBars.length);
  const thumbLeft = progressRatio * barWidth;

  return (
    <View style={styles.container}>
      {/* Dynamic Blurred Background */}
      {currentThumbnail && (
        <>
          <Image 
            source={{ uri: currentThumbnail }} 
            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.6 }]} 
            blurRadius={90} 
          />
          {/* Dark gradient/overlay to ensure crisp text readability */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        </>
      )}

      {/* Content Wrapper to handle padding independent of full-bleed background */}
      <View style={styles.content}>
        {/* Header / Dismiss */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.dismissBtn}>
          <ChevronDown size={32} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerSubtitle}>PLAYING FROM LIBRARY</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentAlbum || 'Laika Music'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Album Art */}
      <Animated.View style={[styles.artworkContainer, { transform: [{ scale: scaleAnim }] }]}>
        {currentThumbnail ? (
          <Image source={{ uri: currentThumbnail }} style={styles.artworkImage} />
        ) : (
          <View style={styles.artworkFallback}>
            <Text style={styles.artworkInitial}>
              {currentTitle.slice(0, 1).toUpperCase() || 'L'}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <View style={styles.trackTextGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTitle}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentArtist}
          </Text>
        </View>
      </View>

      {/* Waveform Progress */}
      <View style={styles.progressSection}>
        <View
          style={styles.progressBarContainer}
          onLayout={handleWaveformLayout}
          {...panResponder.panHandlers}>
          <View style={styles.waveformTrack}>
            {waveformBars.map((_, index) => (
              <View
                key={`wave-${index}`}
                style={[
                  styles.waveformBar,
                  waveformBarHeights[index],
                  index < activeBarCount ? styles.waveformBarActive : styles.waveformBarInactive,
                ]}
              />
            ))}
          </View>
          <View
            style={[
              styles.waveformThumb,
              {
                left: thumbLeft,
              },
            ]}
          />
          <View style={[styles.waveformGlow, { width: thumbLeft }]} />
          <View style={styles.waveformTouchOverlay}>
            <Text style={styles.waveformTouchHint}>{isScrubbing ? 'Scrubbing...' : ' '}</Text>
          </View>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.secondaryControl, isShuffleEnabled && styles.secondaryControlActive]}
          disabled={!canControl}
          onPress={onToggleShuffle}
          accessibilityRole="button"
          accessibilityLabel="Toggle shuffle">
          <Shuffle
            size={20}
            color={isShuffleEnabled ? colors.progressFill : colors.textSecondary}
            strokeWidth={2}
          />
        </Pressable>

        <Pressable
          style={[styles.skipButton, !canControl && styles.controlDisabled]}
          onPress={onPrevious}
          disabled={!canControl}
          accessibilityRole="button">
          <SkipBack size={28} color={colors.textPrimary} strokeWidth={2} fill={colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={onTogglePlayPause}
          disabled={!canControl || isLoading}
          style={[styles.playButton, (!canControl || isLoading) && styles.controlDisabled]}
          accessibilityRole="button"
          accessibilityLabel={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.background} />
          ) : isPlaying ? (
            <Pause size={32} color={colors.background} strokeWidth={3} fill={colors.background} />
          ) : (
            <Play size={32} color={colors.background} strokeWidth={3} fill={colors.background} />
          )}
        </Pressable>

        <Pressable
          style={[styles.skipButton, !canControl && styles.controlDisabled]}
          onPress={onNext}
          disabled={!canControl}
          accessibilityRole="button">
          <SkipForward size={28} color={colors.textPrimary} strokeWidth={2} fill={colors.textPrimary} />
        </Pressable>

        <Pressable
          style={[styles.secondaryControl, repeatMode !== 'off' && styles.secondaryControlActive]}
          disabled={!canControl}
          onPress={onCycleRepeatMode}
          accessibilityRole="button"
          accessibilityLabel="Cycle repeat mode">
          <Repeat
            size={20}
            color={repeatMode !== 'off' ? colors.progressFill : colors.textSecondary}
            strokeWidth={2}
          />
          {repeatMode === 'one' ? <Text style={styles.repeatOneLabel}>1</Text> : null}
        </Pressable>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  dismissBtn: {
    padding: spacing.xs,
  },
  headerTitleGroup: {
    alignItems: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  artworkContainer: {
    width: 280,
    height: 280,
    borderRadius: radii.md,
  },
  artworkImage: {
    width: 280,
    height: 280,
    borderRadius: radii.md,
  },
  artworkFallback: {
    width: 280,
    height: 280,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkInitial: {
    color: colors.textMuted,
    fontSize: 96,
    fontWeight: '800',
  },
  trackInfo: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  trackTextGroup: {
    flex: 1,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  artist: {
    marginTop: spacing.xs,
    ...typography.heading,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  progressSection: {
    width: '100%',
    marginTop: spacing.md,
  },
  progressBarContainer: {
    width: '100%',
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  waveformTrack: {
    width: '100%',
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  waveformBarActive: {
    backgroundColor: colors.progressFill,
  },
  waveformBarInactive: {
    backgroundColor: colors.progressTrack,
  },
  waveformThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -8,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.textPrimary,
    borderWidth: 2,
    borderColor: colors.progressFill,
  },
  waveformGlow: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -1,
    height: 2,
    backgroundColor: colors.progressFill,
    opacity: 0.35,
    borderRadius: 1,
  },
  waveformTouchOverlay: {
    position: 'absolute',
    width: '100%',
    top: -18,
    alignItems: 'center',
  },
  waveformTouchHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  controlsRow: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    width: '100%',
  },
  secondaryControl: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryControlActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.14)',
  },
  repeatOneLabel: {
    position: 'absolute',
    right: 4,
    bottom: 2,
    color: colors.progressFill,
    fontSize: 10,
    fontWeight: '800',
  },
  skipButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDisabled: {
    opacity: 0.4,
  },
});
