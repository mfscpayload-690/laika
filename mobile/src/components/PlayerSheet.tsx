import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
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
  withTiming,
  withDelay,
  useAnimatedReaction,
  useAnimatedProps,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { ChevronDown, Music, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Mic2 } from 'lucide-react-native';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { SyncedLyrics } from './SyncedLyrics';

import { usePlayback } from '../context/PlaybackContext';
import { colors, radii, spacing, typography } from '../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_BASE_HEIGHT = 62;
const MINI_PLAYER_HEIGHT = 64 + 10; // 64 height + 10 paddingTop approx

const BUTTER_SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
  overshootClamping: false,
};



function ProgressBar() {
  const { position, duration } = useProgress(250);
  const isDragging = useSharedValue(false);
  const seekPosition = useSharedValue(0);
  const trackWidth = useSharedValue(0);

  useEffect(() => {
    if (!isDragging.value && duration > 0) {
      seekPosition.value = position;
    }
  }, [position, duration]);

  const handleSeek = useCallback((pos: number) => {
    TrackPlayer.seekTo(pos).catch(err => console.warn('ProgressBar: seek failed', err));
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((e) => {
      if (trackWidth.value > 0 && duration > 0) {
        const newPos = (e.x / trackWidth.value) * duration;
        seekPosition.value = Math.min(duration, Math.max(0, newPos));
      }
    })
    .onEnd(() => {
      runOnJS(handleSeek)(seekPosition.value);
      isDragging.value = false;
    });

  const progressStyle = useAnimatedStyle(() => {
    const percent = duration > 0 ? (seekPosition.value / duration) * 100 : 0;
    return { width: `${Math.min(100, Math.max(0, percent))}%` };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const trackW = trackWidth.value || 0;
    // Keep thumb center within bounds or use a fixed offset
    const x = duration > 0 ? (seekPosition.value / duration) * (trackW - 12) : 0;
    return {
      transform: [{ translateX: Math.min(trackW - 12, Math.max(0, x)) }],
    };
  });

  const formatTime = (seconds: number) => {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const [displayPosition, setDisplayPosition] = useState(0);

  useAnimatedReaction(
    () => isDragging.value ? seekPosition.value : position,
    (val) => {
      runOnJS(setDisplayPosition)(val);
    },
    [position]
  );

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
        <Text style={styles.progressTimeText}>
          {formatTime(displayPosition)}
        </Text>
        <Text style={styles.progressTimeText}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}

export function PlayerSheet() {
  const insets = useSafeAreaInsets();
  const playerScrollViewRef = useRef<Animated.ScrollView>(null);
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
  const currentArtist = activeRemoteTrack?.artist || activeSong?.artist || 'Start listening...';
  const currentArtwork = activeRemoteTrack?.thumbnail || activeSong?.artwork;
  const currentAlbum = activeRemoteTrack?.album || activeSong?.album;
  const currentDurationMs = activeRemoteTrack?.duration_ms || (activeSong ? 0 : 0); // Local tracks duration handled by useProgress

  const { position, duration } = useProgress();
  const [lyricsData, setLyricsData] = useState<{ plainLyrics?: string; syncedLyrics?: string } | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  useEffect(() => {
    if (currentTitle && currentArtist && currentTitle !== 'No track selected') {
      setLyricsLoading(true);
      const dms = currentDurationMs || Math.floor(duration * 1000);
      const url = `http://localhost:8000/lyrics/?title=${encodeURIComponent(currentTitle)}&artist=${encodeURIComponent(currentArtist)}&album=${encodeURIComponent(currentAlbum || '')}&duration_ms=${dms}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setLyricsData(data);
          setLyricsLoading(false);
        })
        .catch(() => {
          setLyricsData(null);
          setLyricsLoading(false);
        });
    }
  }, [currentTitle, currentArtist]);

  const miniPlayerBottomOffset = 92 + Math.max(insets.bottom, 0);
  const MAX_TRANSLATE = SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - miniPlayerBottomOffset - insets.top; // adjusted for safe area
  const MIN_TRANSLATE = 0;

  const translateY = useSharedValue(MAX_TRANSLATE);
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const isExpanded = useSharedValue(false);
  const scrollY = useSharedValue(0);
  const showLyrics = useSharedValue(0); // 0: Player, 1: Lyrics
  const [isLyricsMode, setIsLyricsMode] = useState(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

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
    translateY.value = withSpring(destination, BUTTER_SPRING_CONFIG);
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
      translateY.value = withSpring(maxTranslateY, BUTTER_SPRING_CONFIG);
    }
  }, [maxTranslateY]);

  const switchTrack = useCallback((direction: 'next' | 'prev') => {
    if (direction === 'next') {
      next();
    } else {
      previous(true);
    }
    
    // Safety fallback: If the track doesn't change (e.g. end of queue), 
    // the card might get stuck at the edge. We force it back after a delay on the UI thread.
    translateX.value = withDelay(800, withSpring(0, BUTTER_SPRING_CONFIG));
  }, [next, previous, translateX]);

  useEffect(() => {
    // When the track changes, React re-renders with the new metadata.
    // If we're off-screen from a swipe, trigger the entrance animation.
    if (Math.abs(translateX.value) >= SCREEN_WIDTH - 10) {
      if (translateX.value < 0) {
        // Swiped left (Next). Bring new track in from the right.
        translateX.value = SCREEN_WIDTH;
      } else {
        // Swiped right (Prev). Bring new track in from the left.
        translateX.value = -SCREEN_WIDTH;
      }
      translateX.value = withSpring(0, BUTTER_SPRING_CONFIG);
    }
  }, [currentTrackId, translateX]);

  // 1. Gesture for MINI PLAYER (Swipe Up to Expand)
  const miniPlayerExpandGesture = Gesture.Pan()
    .enabled(hasTrack)
    .activeOffsetY([-10, 0]) // Only catch upward swipes
    .onUpdate((event) => {
      const newTranslateY = maxTranslateY + event.translationY;
      translateY.value = Math.max(MIN_TRANSLATE, Math.min(newTranslateY, maxTranslateY));
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      if (velocity < -500 || translateY.value < maxTranslateY - 100) {
        snapTo(MIN_TRANSLATE);
      } else {
        snapTo(maxTranslateY);
      }
    });

  // 2. Gesture for FULL PLAYER HEADER (Swipe Down to Minimize)
  const fullPlayerDismissGesture = Gesture.Pan()
    .activeOffsetY([0, 10]) // Only catch downward swipes
    .onUpdate((event) => {
      const newTranslateY = MIN_TRANSLATE + event.translationY;
      translateY.value = Math.max(MIN_TRANSLATE, Math.min(newTranslateY, maxTranslateY));
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      if (velocity > 500 || translateY.value > MIN_TRANSLATE + 100) {
        snapTo(maxTranslateY);
      } else {
        snapTo(MIN_TRANSLATE);
      }
    });

  const horizontalPanGesture = Gesture.Pan()
    .enabled(hasTrack && !activeRemoteTrack) // Only enable if track is loaded and not in remote mode
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15]) // Don't trigger horizontal if swiping vertical
    .onStart(() => {
      if (!isExpanded.value) return;
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
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 150 }, () => {
          runOnJS(switchTrack)('next');
        });
      } else if (translateX.value > THRESHOLD || velocity > 500) {
        // Swipe right -> Previous
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 150 }, () => {
          runOnJS(switchTrack)('prev');
        });
      } else {
        // Snap back
        translateX.value = withSpring(0, BUTTER_SPRING_CONFIG);
      }
    });

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
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.4],
      [1, 0.7],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.4],
      [1, 0.96],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { translateX: translateX.value },
        { scale }
      ],
    };
  });

  const animatedArtworkStyle = useAnimatedStyle(() => {
    return {
      opacity: 1,
      transform: [
        { translateY: 0 },
        { scale: 1 }
      ],
    };
  });

  const animatedLyricsCardStyle = useAnimatedStyle(() => {
    const height = interpolate(
      showLyrics.value,
      [0, 1],
      [400, SCREEN_HEIGHT - insets.top - insets.bottom - 100] 
    );
    // Remove the negative translateY so it stays naturally below the controls in the ScrollView
    const opacity = interpolate(showLyrics.value, [0, 0.2, 1], [0.9, 1, 1]);

    return {
      height,
      opacity,
      marginTop: spacing.md,
      zIndex: 10,
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

  // if (!hasTrack) {
  //   return null;
  // }

  return (
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
        <GestureDetector gesture={miniPlayerExpandGesture}>
          <Animated.View style={[styles.miniPlayerWrapper, animatedMiniPlayerStyle]}>
            <Pressable
              style={({pressed}) => [styles.miniPlayer, {paddingBottom: 10 + Math.max(insets.bottom - 4, 0)}, pressed && hasTrack && {backgroundColor: 'rgba(255,255,255,0.05)'}, !hasTrack && { opacity: 0.7 }]}
            android_ripple={hasTrack ? { color: 'rgba(255,255,255,0.1)' } : null}
            onPress={() => {
              if (hasTrack) snapTo(MIN_TRANSLATE);
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

            <View style={[styles.miniControls, !hasTrack && { opacity: 0.5 }]}>
              <Pressable 
                style={({pressed}) => [styles.miniControlBtn, pressed && hasTrack && {transform: [{scale: 0.85}]}]} 
                android_ripple={hasTrack ? { color: 'rgba(255,255,255,0.1)', borderless: true, radius: 20 } : null}
                onPress={(e) => { e.stopPropagation(); if (hasTrack) previous(); }} 
                disabled={!hasTrack}
                accessibilityRole="button"
              >
                <SkipBack size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
              <Pressable 
                style={({pressed}) => [styles.miniControlBtn, pressed && hasTrack && {transform: [{scale: 0.85}]}]} 
                android_ripple={hasTrack ? { color: 'rgba(255,255,255,0.1)', borderless: true, radius: 24 } : null}
                onPress={(e) => { e.stopPropagation(); if (hasTrack) togglePlayPause(); }} 
                disabled={!hasTrack}
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
                style={({pressed}) => [styles.miniControlBtn, pressed && hasTrack && {transform: [{scale: 0.85}]}]} 
                android_ripple={hasTrack ? { color: 'rgba(255,255,255,0.1)', borderless: true, radius: 20 } : null}
                onPress={(e) => { e.stopPropagation(); if (hasTrack) next(); }} 
                disabled={!hasTrack}
                accessibilityRole="button"
              >
                <SkipForward size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>

        {/* ===================== FULL PLAYER ===================== */}
        <Animated.View style={[styles.fullPlayerWrapper, { paddingTop: insets.top }, animatedFullPlayerStyle]}>
          <GestureDetector gesture={fullPlayerDismissGesture}>
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
          </GestureDetector>

          <Animated.ScrollView 
            style={styles.fullPlayerContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <GestureDetector gesture={horizontalPanGesture}>
              <Animated.View style={animatedHorizontalContentStyle}>
                <Animated.View style={[styles.artworkContainer, animatedArtworkStyle]}>
                  {currentArtwork ? (
                    <Image source={{ uri: currentArtwork }} style={styles.artworkImage} />
                  ) : (
                    <View style={styles.artworkFallback}>
                      <Music size={48} color={colors.textMuted} />
                    </View>
                  )}
                </Animated.View>

                <View style={styles.trackInfo}>
                  <View style={styles.trackTextGroup}>
                    <Text style={styles.title} numberOfLines={1}>{currentTitle}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{currentArtist}</Text>
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>

            <View style={styles.playerControlsSection}>
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
                  onPress={() => previous()}
                >
                  <SkipBack size={28} color={colors.textPrimary} strokeWidth={2} />
                </Pressable>

                <Pressable
                  onPress={togglePlayPause}
                  disabled={isLoading}
                  style={({pressed}) => [styles.playButton, isLoading && styles.controlDisabled, pressed && {transform: [{scale: 0.94}]}]}
                  android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 36 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="large" color={colors.textPrimary} />
                  ) : isPlaying ? (
                    <Pause size={32} color={colors.textPrimary} strokeWidth={3} />
                  ) : (
                    <Play size={32} color={colors.textPrimary} strokeWidth={3} />
                  )}
                </Pressable>

                <Pressable
                  style={({pressed}) => [styles.skipButton, pressed && {transform: [{scale: 0.9}]}]}
                  android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true, radius: 32 }}
                  onPress={next}
                >
                  <SkipForward size={28} color={colors.textPrimary} strokeWidth={2} />
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

            <Animated.View style={animatedLyricsCardStyle}>
              <View style={styles.secondaryGlassCard}>
                <BlurView 
                  style={StyleSheet.absoluteFill}
                  blurType="dark"
                  blurAmount={20}
                  reducedTransparencyFallbackColor="rgba(0,0,0,0.2)"
                  overlayColor="rgba(0,0,0,0.5)"
                />
                <View style={styles.secondaryGlassCardContent}>
                  <View style={styles.lyricsHeader}>
                    <Text style={styles.secondaryCardTitle}>Lyrics</Text>
                    <View style={styles.lyricsHeaderRight}>
                      {lyricsData?.syncedLyrics && (
                        <View style={styles.syncedBadge}>
                          <Text style={styles.syncedBadgeText}>SYNCED</Text>
                        </View>
                      )}
                      <Pressable 
                        onPress={() => {
                          const nextMode = !isLyricsMode;
                          setIsLyricsMode(nextMode);
                          showLyrics.value = withSpring(nextMode ? 1 : 0);
                        }}
                        style={styles.expandLyricsBtn}
                      >
                        <Mic2 size={18} color={isLyricsMode ? colors.brand : colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                  <SyncedLyrics
                    syncedLrc={lyricsData?.syncedLyrics}
                    plainLyrics={lyricsData?.plainLyrics}
                    currentTimeMs={position * 1000}
                    onSeek={(timeMs) => TrackPlayer.seekTo(timeMs / 1000)}
                    isLoading={lyricsLoading}
                    isStatic={!isLyricsMode} 
                  />
                </View>
              </View>
            </Animated.View>
          </Animated.ScrollView>
        </Animated.View>
      </Animated.View>
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
    borderRadius: 24,
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 0, marginTop: -spacing.xs },
  dismissBtn: { padding: 0, marginLeft: -spacing.xs, borderRadius: 24 },
  headerTitleGroup: { alignItems: 'center', flex: 1, paddingHorizontal: spacing.base },
  headerSubtitle: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 0, opacity: 1.0 },
  headerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  headerSpacer: { width: 40 },
  
  artworkContainer: { width: '88%', aspectRatio: 1, alignSelf: 'center', marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  artworkImage: { width: '100%', height: '100%', borderRadius: radii.xl },
  artworkFallback: { width: '100%', height: '100%', borderRadius: radii.xl, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  artworkInitial: { ...typography.display, fontSize: 72, color: colors.textMuted },
  
  trackInfo: { marginTop: spacing.md, marginBottom: spacing.lg, paddingHorizontal: spacing.xs },
  trackTextGroup: { width: '100%' },
  title: { ...typography.display, color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  artist: { ...typography.body, color: colors.textSecondary, fontSize: 17, fontWeight: '500' },

  mainGlassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  secondaryGlassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  secondaryGlassCardContent: { flex: 1 },
  lyricsHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    height: 70, // Fixed height to match standard mode height
  },
  secondaryCardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  syncedBadge: { 
    backgroundColor: 'rgba(29, 185, 84, 0.2)', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4, 
    marginLeft: 8 
  },
  syncedBadgeText: { color: colors.brand, fontSize: 10, fontWeight: '900' },
  secondaryCardPlaceholder: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },

  progressContainer: { marginBottom: spacing.lg },
  progressBarHitbox: { paddingVertical: 12, justifyContent: 'center' },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.textPrimary, borderRadius: 2 },
  progressThumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF', top: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 3 },
  progressTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  progressTimeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', opacity: 0.8, fontVariant: ['tabular-nums'] },
  
  controlsRow: { marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, width: '100%' },
  secondaryControl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  secondaryControlActive: { backgroundColor: 'rgba(29, 185, 84, 0.14)' },
  repeatOneLabel: { position: 'absolute', right: 4, bottom: 2, color: colors.progressFill, fontSize: 10, fontWeight: '800' },
  skipButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  controlDisabled: { opacity: 0.4 },
  
  fullPlayerContent: { flex: 1, marginTop: spacing.md, position: 'relative' },
  playerControlsSection: { width: '100%', paddingHorizontal: spacing.xs, marginBottom: spacing.lg },
  lyricsHeaderRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  expandLyricsBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: spacing.sm },
});
