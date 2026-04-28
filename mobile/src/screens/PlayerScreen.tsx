import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pause, Play, SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react-native';
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
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
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
  queueSize,
  currentIndex,
  isReady,
  isPlaying,
  isLoading,
  onTogglePlayPause,
  onNext,
  onPrevious,
}: PlayerScreenProps) {
  const hasTrack = Boolean(currentPath);
  const canControl = isReady && hasTrack;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  const [barWidth, setBarWidth] = useState(0);

  // Pulse animation on play state change
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isPlaying ? 1.02 : 1.0,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [isPlaying, scaleAnim]);

  // Poll progress when playing
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      TrackPlayer.getProgress()
        .then(p => setProgress(p))
        .catch(() => undefined);
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSeek = (event: { nativeEvent: { locationX: number } }) => {
    if (!canControl || barWidth === 0 || progress.duration === 0) {
      return;
    }

    const seekPosition = (event.nativeEvent.locationX / barWidth) * progress.duration;
    TrackPlayer.seekTo(seekPosition).catch(() => undefined);
  };

  const progressPercent =
    progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <View style={styles.container}>
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

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Pressable
          style={styles.progressBarContainer}
          onPress={handleSeek}
          onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
          disabled={!canControl}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(progress.position)}</Text>
          <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <Pressable style={styles.secondaryControl} disabled={!canControl}>
          <Shuffle size={20} color={colors.textSecondary} strokeWidth={2} />
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

        <Pressable style={styles.secondaryControl} disabled={!canControl}>
          <Repeat size={20} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
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
    marginTop: spacing.xxl,
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
    marginTop: spacing.xl,
  },
  progressBarContainer: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.progressFill,
    borderRadius: 2,
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
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    width: '100%',
  },
  secondaryControl: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
