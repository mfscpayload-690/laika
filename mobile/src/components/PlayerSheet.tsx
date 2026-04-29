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
} from 'react-native-reanimated';
import { ChevronDown, Music, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import TrackPlayer from 'react-native-track-player';

import { usePlayback } from '../context/PlaybackContext';
import { colors, radii, spacing, typography } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_BASE_HEIGHT = 62;
const MINI_PLAYER_HEIGHT = 64 + 10; // 64 height + 10 paddingTop approx

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

  const panGesture = Gesture.Pan()
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

  // Background blur opacity
  const animatedBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [MIN_TRANSLATE, maxTranslateY],
      [0.6, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  if (!hasTrack) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        style={[styles.sheetContainer, animatedSheetStyle]}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {/* Full Player Background */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedBgStyle]}>
          {currentArtwork && (
            <Image 
              source={{ uri: currentArtwork }} 
              style={StyleSheet.absoluteFill as any} 
              blurRadius={90} 
            />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
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

          <View style={styles.artworkContainer}>
            {currentArtwork ? (
              <Image source={{ uri: currentArtwork }} style={styles.artworkImage} />
            ) : (
              <View style={styles.artworkFallback}>
                <Text style={styles.artworkInitial}>
                  {currentTitle.slice(0, 1).toUpperCase() || 'L'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.trackInfo}>
            <View style={styles.trackTextGroup}>
              <Text style={styles.title} numberOfLines={1}>{currentTitle}</Text>
              <Text style={styles.artist} numberOfLines={1}>{currentArtist}</Text>
            </View>
          </View>

          {/* Simple controls for now, will add progress bar in next step */}
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
  
  artworkContainer: { width: '100%', aspectRatio: 1, marginTop: spacing.xl, marginBottom: spacing.xxl, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  artworkImage: { width: '100%', height: '100%', borderRadius: radii.xl },
  artworkFallback: { width: '100%', height: '100%', borderRadius: radii.xl, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  artworkInitial: { ...typography.display, fontSize: 72, color: colors.textMuted },
  
  trackInfo: { marginBottom: spacing.xl },
  trackTextGroup: { flex: 1 },
  title: { ...typography.display, fontSize: 26, marginBottom: spacing.xs },
  artist: { ...typography.body, color: colors.textSecondary, fontSize: 18 },
  
  controlsRow: { marginTop: spacing.xl, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, width: '100%' },
  secondaryControl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  secondaryControlActive: { backgroundColor: 'rgba(29, 185, 84, 0.14)' },
  repeatOneLabel: { position: 'absolute', right: 4, bottom: 2, color: colors.progressFill, fontSize: 10, fontWeight: '800' },
  skipButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  controlDisabled: { opacity: 0.4 },
});
