import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useAnimatedReaction,
  useAnimatedProps,
} from 'react-native-reanimated';
import { ChevronDown, Music, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';

import { usePlayback } from '../context/PlaybackContext';
import { colors, radii, spacing, typography } from '../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_BASE_HEIGHT = 62;
const MINI_PLAYER_HEIGHT = 64 + 10; // 64 height + 10 paddingTop approx

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

function ProgressBar() {
  const { position, duration } = useProgress(250);
  const isDragging = useSharedValue(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const seekPosition = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const [dragTime, setDragTime] = useState(0);

  useEffect(() => {
    if (!isDraggingState && duration > 0) {
      seekPosition.value = position;
    }
  }, [position, duration, isDraggingState]);

  useAnimatedReaction(
    () => seekPosition.value,
    (val) => {
      if (isDragging.value) {
        runOnJS(setDragTime)(val);
      }
    }
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      isDragging.value = true;
      runOnJS(setIsDraggingState)(true);
    })
    .onUpdate((e) => {
      if (trackWidth.value > 0 && duration > 0) {
        const newPos = (e.x / trackWidth.value) * duration;
        seekPosition.value = clamp(newPos, 0, duration);
      }
    })
    .onEnd(() => {
      runOnJS(TrackPlayer.seekTo)(seekPosition.value);
      isDragging.value = false;
      runOnJS(setIsDraggingState)(false);
    });

  const progressStyle = useAnimatedStyle(() => {
    const percent = duration > 0 ? (seekPosition.value / duration) * 100 : 0;
    return { width: `${clamp(percent, 0, 100)}%` };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const percent = duration > 0 ? (seekPosition.value / duration) * 100 : 0;
    return { left: `${clamp(percent, 0, 100)}%` };
  });

  const displayTime = isDraggingState ? dragTime : position;

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.progressContainer}>
      <GestureDetector gesture={panGesture}>
        <View 
          style={styles.progressBarHitbox} 
          onLayout={(e) => { trackWidth.value = e.nativeEvent.layout.width; }}
        >
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, progressStyle]} />
          </View>
          <Animated.View style={[styles.progressThumb, thumbStyle]} />
        </View>
      </GestureDetector>
      <View style={styles.progressTimeRow}>
        <Text style={styles.progressTimeText}>{formatTime(displayTime)}</Text>
        <Text style={styles.progressTimeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

export function PlayerSheet() {
  const insets = useSafeAreaInsets();
  const {
    currentTrackId,
    activeRemoteTrack,
    songs,
    isPlaying,
    isLoading,
    togglePlayPause,
    next,
    previous,
    isShuffleEnabled,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayback();

  const hasTrack = Boolean(currentTrackId || activeRemoteTrack);
  const activeSong = songs.find(s => s.id === currentTrackId);
  const currentTitle = activeRemoteTrack?.title || activeSong?.title || 'No track selected';
  const currentArtist = activeRemoteTrack?.artist || activeSong?.artist || 'Unknown Artist';
  const currentArtwork = activeRemoteTrack?.thumbnail || activeSong?.artwork;
  const currentAlbum = activeSong?.album;

  const miniPlayerBottomOffset = TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 0) + 6;
  const MAX_TRANSLATE = SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - miniPlayerBottomOffset - insets.top; // adjusted for safe area
  const MIN_TRANSLATE = 0;

  const translateY = useSharedValue(MAX_TRANSLATE);
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const isExpanded = useSharedValue(false);

  // Auto-expand or stay collapsed when a track loads? 
  // Let's keep it collapsed by default unless user taps it.

  // To snap properly we need the exact height. We'll use onLayout on the wrapper
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);

  const maxTranslateY = useMemo(() => {
    return containerHeight - MINI_PLAYER_HEIGHT - miniPlayerBottomOffset;
  }, [containerHeight, miniPlayerBottomOffset]);

  const snapTo = useCallback((destination: number) => {
    'worklet';
    isExpanded.value = destination === MIN_TRANSLATE;
    translateY.value = withSpring(destination, {
      damping: 20,
      stiffness: 200,
      mass: 0.8,
      overshootClamping: false,
    });
  }, [translateY, isExpanded]);

  useEffect(() => {
    const onBackPress = () => {
      if (isExpanded.value) {
        snapTo(maxTranslateY);
        return true; // Prevent default behavior
      }
      return false; // Let default behavior happen
    };
    
    const { BackHandler } = require('react-native');
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [maxTranslateY, snapTo]);

  useEffect(() => {
    if (!isExpanded.value) {
      translateY.value = withSpring(maxTranslateY, { damping: 20, stiffness: 200 });
    }
  }, [maxTranslateY]);

  // To ensure the new artwork is fully rendered before we spring it into view,
  // we trigger the state change here, and handle the entrance animation in a useEffect.
  const switchTrack = useCallback((direction: 'next' | 'prev') => {
    if (direction === 'next') {
      next();
    } else {
      previous();
    }
  }, [next, previous]);

  useEffect(() => {
    // When the track changes, React re-renders with the new artwork.
    // This effect runs immediately after that render.
    if (translateX.value < -50) {
      // Old track swiped left. Bring new track in from the right.
      translateX.value = SCREEN_WIDTH;
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else if (translateX.value > 50) {
      // Old track swiped right. Bring new track in from the left.
      translateX.value = -SCREEN_WIDTH;
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    }
  }, [currentTrackId]);

  const verticalPanGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      const newTranslateY = (isExpanded.value ? MIN_TRANSLATE : maxTranslateY) + event.translationY;
      translateY.value = Math.max(MIN_TRANSLATE, Math.min(newTranslateY, maxTranslateY));
    })
    .onEnd((event) => {
      const distance = maxTranslateY - MIN_TRANSLATE;
      const progress = 1 - (translateY.value / distance);
      const velocity = event.velocityY;

      if (velocity < -500) {
        snapTo(MIN_TRANSLATE);
      } else if (velocity > 500) {
        snapTo(maxTranslateY);
      } else {
        if (progress > 0.5) {
          snapTo(MIN_TRANSLATE);
        } else {
          snapTo(maxTranslateY);
        }
      }
    });

  const horizontalPanGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onStart(() => {
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      if (isExpanded.value) {
        translateX.value = startTranslateX.value + event.translationX;
      }
    })
    .onEnd((event) => {
      if (!isExpanded.value) return;
      
      const velocity = event.velocityX;
      const THRESHOLD = SCREEN_WIDTH * 0.3;

      if (translateX.value < -THRESHOLD || velocity < -500) {
        // Swipe left -> Next
        translateX.value = withSpring(-SCREEN_WIDTH, { damping: 20, stiffness: 200 });
        runOnJS(switchTrack)('next');
      } else if (translateX.value > THRESHOLD || velocity > 500) {
        // Swipe right -> Previous
        translateX.value = withSpring(SCREEN_WIDTH, { damping: 20, stiffness: 200 });
        runOnJS(switchTrack)('prev');
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const composedGesture = Gesture.Simultaneous(verticalPanGesture, horizontalPanGesture);

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedMiniPlayerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [maxTranslateY - 50, maxTranslateY],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      pointerEvents: opacity > 0.5 ? 'auto' : 'none',
    };
  });

  const animatedFullPlayerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [MIN_TRANSLATE, maxTranslateY - 100],
      [1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      pointerEvents: opacity > 0.5 ? 'auto' : 'none',
    };
  });

  const animatedHorizontalContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Background blur opacity
  const animatedBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [MIN_TRANSLATE, maxTranslateY],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const animatedBgProps = useAnimatedProps(() => {
    return {
      pointerEvents: translateY.value < maxTranslateY - 10 ? 'auto' : 'none',
    } as any;
  });

  if (!hasTrack) {
    return null;
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View 
        style={[styles.sheetContainer, animatedSheetStyle]}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        {/* Full Player Background */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedBgStyle]} animatedProps={animatedBgProps}>
          {currentArtwork ? (
            <Image 
              source={{ uri: currentArtwork }} 
              style={StyleSheet.absoluteFill as any} 
              blurRadius={90} 
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A1A1A' }]} />
          )}
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill as any}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#121212" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grad)" />
          </Svg>
        </Animated.View>

        {/* ===================== MINI PLAYER ===================== */}
        <Animated.View style={[styles.miniPlayerWrapper, animatedMiniPlayerStyle]}>
          <Pressable
            style={({pressed}) => [styles.miniPlayer, {paddingBottom: 10 + Math.max(insets.bottom - 4, 0)}, pressed && {backgroundColor: 'rgba(255,255,255,0.05)'}]}
            android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
            onPress={() => {
              snapTo(MIN_TRANSLATE);
            }}
          >
            {currentArtwork ? (
              <Image source={{uri: currentArtwork}} style={styles.miniArtwork} />
            ) : (
              <View style={styles.miniArtworkFallback}>
                <Music size={18} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.miniPlayerInfo}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>{currentTitle}</Text>
              <Text style={styles.miniPlayerArtist} numberOfLines={1}>{currentArtist}</Text>
            </View>

            <View style={styles.miniControls}>
              <Pressable 
                style={({pressed}) => [styles.miniControlBtn, pressed && {transform: [{scale: 0.85}]}]} 
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 20 }}
                onPress={(e) => { e.stopPropagation(); previous(); }} 
                accessibilityRole="button"
              >
                <SkipBack size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
              <Pressable 
                style={({pressed}) => [styles.miniControlBtn, pressed && {transform: [{scale: 0.85}]}]} 
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 24 }}
                onPress={(e) => { e.stopPropagation(); togglePlayPause(); }} 
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : isPlaying ? (
                  <Pause size={18} color={colors.textPrimary} strokeWidth={2.5} fill={colors.textPrimary} />
                ) : (
                  <Play size={18} color={colors.textPrimary} strokeWidth={2.5} fill={colors.textPrimary} />
                )}
              </Pressable>
              <Pressable 
                style={({pressed}) => [styles.miniControlBtn, pressed && {transform: [{scale: 0.85}]}]} 
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 20 }}
                onPress={(e) => { e.stopPropagation(); next(); }} 
                accessibilityRole="button"
              >
                <SkipForward size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>

        {/* ===================== FULL PLAYER ===================== */}
        <Animated.View style={[styles.fullPlayerWrapper, { paddingTop: Math.max(insets.top, 20) }, animatedFullPlayerStyle]}>
          <View style={styles.header}>
            <Pressable 
              onPress={() => snapTo(maxTranslateY)} 
              style={({pressed}) => [styles.dismissBtn, pressed && {opacity: 0.5}]}
              android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 24 }}
            >
              <ChevronDown size={32} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerSubtitle}>PLAYING FROM LIBRARY</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{currentAlbum || 'Laika Music'}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.mainGlassCard}>
            <BlurView 
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={15}
              reducedTransparencyFallbackColor="rgba(255,255,255,0.06)"
              overlayColor="rgba(0,0,0,0.3)"
            />
            <Animated.View style={animatedHorizontalContentStyle}>
              <View style={styles.artworkContainer}>
                {currentArtwork ? (
                  <Image source={{ uri: currentArtwork }} style={styles.artworkImage} />
                ) : (
                  <View style={styles.artworkFallback}>
                    <Music size={48} color={colors.textMuted} />
                  </View>
                )}
              </View>

              <View style={styles.trackInfo}>
                <View style={styles.trackTextGroup}>
                  <Text style={styles.title} numberOfLines={1}>{currentTitle}</Text>
                  <Text style={styles.artist} numberOfLines={1}>{currentArtist}</Text>
                </View>
              </View>
            </Animated.View>

            <ProgressBar />

            <View style={styles.controlsRow}>
              <Pressable
                style={({pressed}) => [styles.secondaryControl, isShuffleEnabled && styles.secondaryControlActive, pressed && {opacity: 0.7}]}
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 24 }}
                onPress={toggleShuffle}
              >
                <Shuffle size={20} color={isShuffleEnabled ? colors.progressFill : colors.textSecondary} strokeWidth={2} />
              </Pressable>

              <Pressable
                style={({pressed}) => [styles.skipButton, pressed && {transform: [{scale: 0.9}]}]}
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 32 }}
                onPress={previous}
              >
                <SkipBack size={28} color={colors.textPrimary} strokeWidth={2} fill={colors.textPrimary} />
              </Pressable>

              <Pressable
                onPress={togglePlayPause}
                disabled={isLoading}
                style={({pressed}) => [styles.playButton, isLoading && styles.controlDisabled, pressed && {transform: [{scale: 0.94}]}]}
                android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 36 }}
              >
                {isLoading ? (
                  <ActivityIndicator size="large" color={colors.background} />
                ) : isPlaying ? (
                  <Pause size={32} color={colors.background} strokeWidth={3} fill={colors.background} />
                ) : (
                  <Play size={32} color={colors.background} strokeWidth={3} fill={colors.background} />
                )}
              </Pressable>

              <Pressable
                style={({pressed}) => [styles.skipButton, pressed && {transform: [{scale: 0.9}]}]}
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 32 }}
                onPress={next}
              >
                <SkipForward size={28} color={colors.textPrimary} strokeWidth={2} fill={colors.textPrimary} />
              </Pressable>

              <Pressable
                style={({pressed}) => [styles.secondaryControl, repeatMode !== 'off' && styles.secondaryControlActive, pressed && {opacity: 0.7}]}
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 24 }}
                onPress={cycleRepeatMode}
              >
                <Repeat size={20} color={repeatMode !== 'off' ? colors.progressFill : colors.textSecondary} strokeWidth={2} />
                {repeatMode === 'one' ? <Text style={styles.repeatOneLabel}>1</Text> : null}
              </Pressable>
            </View>
          </View>

          <View style={styles.secondaryGlassCard}>
            <BlurView 
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={20}
              reducedTransparencyFallbackColor="rgba(0,0,0,0.2)"
              overlayColor="rgba(0,0,0,0.5)"
            />
            <View style={styles.secondaryGlassCardContent}>
              <Text style={styles.secondaryCardTitle}>Up Next / Lyrics</Text>
              <Text style={styles.secondaryCardPlaceholder}>Playing from Library...</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  miniPlayerWrapper: {
    position: 'absolute',
    top: 0,
    left: spacing.sm,
    right: spacing.sm,
    height: MINI_PLAYER_HEIGHT,
    zIndex: 10,
  },
  miniPlayer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },
  miniArtwork: { width: 44, height: 44, borderRadius: 6, marginRight: 10 },
  miniArtworkFallback: { width: 44, height: 44, borderRadius: 6, marginRight: 10, backgroundColor: '#3B3B3B', alignItems: 'center', justifyContent: 'center' },
  miniPlayerInfo: { flex: 1, marginRight: 8 },
  miniPlayerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  miniPlayerArtist: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  miniControls: { flexDirection: 'row', alignItems: 'center' },
  miniControlBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  
  fullPlayerWrapper: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  dismissBtn: { padding: spacing.xs, marginLeft: -spacing.xs, borderRadius: 24 },
  headerTitleGroup: { alignItems: 'center', flex: 1, paddingHorizontal: spacing.base },
  headerSubtitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  headerSpacer: { width: 40 },
  
  artworkContainer: { width: '100%', aspectRatio: 1, marginBottom: spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  artworkImage: { width: '100%', height: '100%', borderRadius: radii.xl },
  artworkFallback: { width: '100%', height: '100%', borderRadius: radii.xl, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  artworkInitial: { ...typography.display, fontSize: 72, color: colors.textMuted },
  
  trackInfo: { marginBottom: spacing.lg },
  trackTextGroup: { flex: 1 },
  title: { ...typography.display, fontSize: 22, marginBottom: spacing.xs },
  artist: { ...typography.body, color: colors.textSecondary, fontSize: 16 },

  mainGlassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  secondaryGlassCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    minHeight: 120,
    overflow: 'hidden',
  },
  secondaryGlassCardContent: {
    padding: spacing.lg,
  },
  secondaryCardTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  secondaryCardPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  progressContainer: { marginBottom: spacing.lg },
  progressBarHitbox: { paddingVertical: 12, justifyContent: 'center' },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.textPrimary, borderRadius: 2 },
  progressThumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF', top: 8, marginLeft: -6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 3 },
  progressTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressTimeText: { color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
  
  controlsRow: { marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, width: '100%' },
  secondaryControl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  secondaryControlActive: { backgroundColor: 'rgba(29, 185, 84, 0.14)' },
  repeatOneLabel: { position: 'absolute', right: 4, bottom: 2, color: colors.progressFill, fontSize: 10, fontWeight: '800' },
  skipButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  controlDisabled: { opacity: 0.4 },
});
