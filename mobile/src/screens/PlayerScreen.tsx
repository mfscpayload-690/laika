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
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';
import TrackPlayer from 'react-native-track-player';

import { colors, radii, shadows, spacing, typography } from '../theme';

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

type SkipButtonProps = {
  Icon: React.ElementType;
  onPress: () => void;
  disabled: boolean;
};

function SkipButton({ Icon, onPress, disabled }: SkipButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.skipButton, disabled && styles.skipButtonDisabled]}
      accessibilityRole="button">
      <Icon size={24} color={colors.textPrimary} strokeWidth={2.5} />
    </Pressable>
  );
}

type PlayPauseButtonProps = {
  isPlaying: boolean;
  isLoading: boolean;
  disabled: boolean;
  onPress: () => void;
};

function PlayPauseButton({ isPlaying, isLoading, disabled, onPress }: PlayPauseButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[styles.playButton, (disabled || isLoading) && styles.playButtonDisabled]}
      accessibilityRole="button"
      accessibilityLabel={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#fff7ed" />
      ) : isPlaying ? (
        <Pause size={32} color="#fff7ed" strokeWidth={2.5} fill="#fff7ed" />
      ) : (
        <Play size={32} color="#fff7ed" strokeWidth={2.5} fill="#fff7ed" />
      )}
    </Pressable>
  );
}

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
      toValue: isPlaying ? 1.03 : 1.0,
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

      <Text style={styles.title} numberOfLines={1}>
        {currentTitle}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {currentArtist}
      </Text>
      {currentAlbum ? (
        <Text style={styles.album} numberOfLines={1}>
          {currentAlbum}
        </Text>
      ) : null}

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

      <View style={styles.controlsRow}>
        <SkipButton Icon={SkipBack} onPress={onPrevious} disabled={!canControl} />
        <PlayPauseButton
          isPlaying={isPlaying}
          isLoading={isLoading}
          disabled={!canControl}
          onPress={onTogglePlayPause}
        />
        <SkipButton Icon={SkipForward} onPress={onNext} disabled={!canControl} />
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
    paddingTop: spacing.xl,
    backgroundColor: 'transparent',
  },
  artworkContainer: {
    width: 240,
    height: 240,
    borderRadius: radii.xxl,
    ...shadows.glow,
  },
  artworkImage: {
    width: 240,
    height: 240,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.coverBorder,
  },
  artworkFallback: {
    width: 240,
    height: 240,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.coverBorder,
    backgroundColor: colors.deepBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkInitial: {
    color: colors.skyLight,
    fontSize: 96,
    fontWeight: '800',
  },
  title: {
    marginTop: spacing.xl,
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },
  artist: {
    marginTop: spacing.sm,
    ...typography.heading,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  album: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    backgroundColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.brand,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  timeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  controlsRow: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  skipButton: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonDisabled: {
    opacity: 0.4,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.orange,
    backgroundColor: colors.orangeDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonDisabled: {
    opacity: 0.4,
  },
});
