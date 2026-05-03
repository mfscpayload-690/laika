import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  Pressable,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useNavigationState, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TextInput } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  useAnimatedProps,
  useDerivedValue,
  useAnimatedSensor,
  SensorType,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { ChevronDown, Music, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Mic2, Heart, Plus, Check } from 'lucide-react-native';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { SyncedLyrics } from './SyncedLyrics';
import { BouncyPressable } from './BouncyPressable';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

import { useMusicStore } from '../store/musicStore';
import { useLikesStore } from '../store/likesStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useUIStore } from '../store/uiStore';

import { colors, radii, spacing, typography } from '../theme';
import { API_BASE_URL } from '../services/api';
import { State } from 'react-native-track-player';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 64 + 10;
const MINI_ARTWORK_SIZE = 44;
const FULL_ARTWORK_SIZE = SCREEN_WIDTH - 110;

const BUTTER_SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
  overshootClamping: false,
};

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
    paddingHorizontal: 16,
    paddingTop: 12,
    borderRadius: 24,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
  },
  miniArtwork: { width: 44, height: 44, borderRadius: 6, marginRight: 10 },
  miniArtworkFallback: { width: 44, height: 44, borderRadius: 6, marginRight: 10, backgroundColor: '#3B3B3B', alignItems: 'center', justifyContent: 'center' },
  miniPlayerInfo: { flex: 1, marginRight: 8 },
  miniPlayerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  miniPlayerArtist: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  miniControls: { flexDirection: 'row', alignItems: 'center' },
  miniControlsDisabled: { opacity: 0.5 },
  miniControlBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  fullPlayerBgFallback: { backgroundColor: '#1A1A1A' },

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

  artworkContainer: { width: '82%', aspectRatio: 1, alignSelf: 'center', marginBottom: spacing.base },
  artworkPlaceholder: { opacity: 0 },
  miniArtworkPlaceholder: { width: MINI_ARTWORK_SIZE, height: MINI_ARTWORK_SIZE, marginRight: 10 },
  sharedArtworkImage: { width: '100%', height: '100%', borderRadius: 0 },
  sharedArtworkFallback: { width: '100%', height: '100%', backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  artworkImage: { width: '100%', height: '100%', borderRadius: radii.xl },
  artworkFallback: { width: '100%', height: '100%', borderRadius: radii.xl, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  artworkInitial: { ...typography.display, fontSize: 72, color: colors.textMuted },

  trackInfo: { marginTop: spacing.xs, marginBottom: spacing.xs, paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackTextGroup: { flex: 1, marginRight: spacing.md },
  title: { ...typography.display, color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 0 },
  artist: { ...typography.body, color: colors.textSecondary, fontSize: 16, fontWeight: '500' },
  heartBtn: { padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  addPlaylistBtn: {
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mainGlassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    marginTop: spacing.xxl,
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
    marginLeft: 8,
  },
  syncedBadgeText: { color: colors.brand, fontSize: 10, fontWeight: '900' },
  secondaryCardPlaceholder: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },

  progressContainer: { marginBottom: spacing.xs },
  progressBarHitbox: { paddingVertical: 6, justifyContent: 'center' },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.textPrimary, borderRadius: 2 },
  progressThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    top: 2,
    elevation: 3,
  },
  progressThumbShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  progressTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 2 },
  progressTimeText: { 
    color: colors.textSecondary, 
    fontSize: 11, 
    fontWeight: '700', 
    opacity: 0.8, 
    fontVariant: ['tabular-nums'],
    padding: 0,
    margin: 0,
    height: 16,
  },

  controlsRow: { marginTop: 0, marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, width: '100%' },
  secondaryControl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  secondaryControlActive: { backgroundColor: 'rgba(29, 185, 84, 0.14)' },
  repeatOneLabel: { position: 'absolute', right: 4, bottom: 2, color: colors.progressFill, fontSize: 10, fontWeight: '800' },
  skipButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  controlDisabled: { opacity: 0.4 },

  fullPlayerContent: { flex: 1, marginTop: spacing.md, position: 'relative' },
  playerControlsSection: { width: '100%', paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
  lyricsHeaderRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  expandLyricsBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: spacing.sm },
});



const ProgressBar = React.memo(() => {
  const { position, duration } = useProgress(500);
  const isDragging = useSharedValue(false);
  const seekPosition = useSharedValue(0);
  const trackWidth = useSharedValue(0);

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
    const positionForUi = isDragging.value ? seekPosition.value : position;
    const percent = duration > 0 ? (positionForUi / duration) * 100 : 0;
    return { width: `${Math.min(100, Math.max(0, percent))}%` };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const trackW = trackWidth.value || 0;
    const positionForUi = isDragging.value ? seekPosition.value : position;
    // Keep thumb center within bounds or use a fixed offset
    const x = duration > 0 ? (positionForUi / duration) * (trackW - 12) : 0;
    return {
      transform: [{ translateX: Math.min(trackW - 12, Math.max(0, x)) }],
    };
  });

  const formatTime = (seconds: number) => {
    'worklet';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressTimeProps = useAnimatedProps(() => {
    const val = isDragging.value ? seekPosition.value : position;
    return {
      value: formatTime(val),
    } as any;
  }, [position]);

  const durationTimeProps = useAnimatedProps(() => {
    return {
      value: formatTime(duration),
    } as any;
  });

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
          <Animated.View style={[styles.progressThumb, thumbStyle]}>
            <View style={styles.progressThumbShadow} />
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={styles.progressTimeRow}>
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          style={styles.progressTimeText}
          animatedProps={progressTimeProps}
          defaultValue="0:00"
        />
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          style={styles.progressTimeText}
          animatedProps={durationTimeProps}
          defaultValue="0:00"
        />
      </View>
    </View>
  );
});
const LyricsSection = React.memo(({
  lyricsData,
  isLoading,
  isLyricsMode,
  setIsLyricsMode,
  showLyrics,
  animatedStyle
}: any) => {
  const { position } = useProgress(1000);

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.secondaryGlassCard}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.2)"
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
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
            onSeek={(timeMs: number) => TrackPlayer.seekTo(timeMs / 1000)}
            isLoading={isLoading}
            isStatic={!isLyricsMode}
          />
        </View>
      </View>
    </Animated.View>
  );
});

export function PlayerSheet() {
  const insets = useSafeAreaInsets();

  // Zustand State
  const currentTrackId = useMusicStore(state => state.currentTrackId);
  const activeRemoteTrack = useMusicStore(state => state.activeRemoteTrack);
  const songs = useMusicStore(state => state.songs);
  const isPlaying = useMusicStore(state => state.playbackState === State.Playing);
  const isLoading = useMusicStore(state => state.playbackState === State.Loading || state.playbackState === State.Buffering || state.isResolving);
  const togglePlayPause = useMusicStore(state => state.togglePlayPause);
  const next = useMusicStore(state => state.next);
  const previous = useMusicStore(state => state.previous);
  const isShuffleEnabled = useMusicStore(state => state.isShuffleEnabled);
  const repeatMode = useMusicStore(state => state.repeatMode);
  const toggleShuffle = useMusicStore(state => state.toggleShuffle);
  const cycleRepeatMode = useMusicStore(state => state.cycleRepeatMode);

  const isLiked = useLikesStore(state => state.isLiked);
  const toggleLike = useLikesStore(state => state.toggleLike);
  const playlists = usePlaylistStore(state => state.playlists);
  const showAddToPlaylist = useUIStore(state => state.showAddToPlaylist);

  const focusedRouteName = useNavigationState(state => {
    const route = state?.routes[state.index];
    if (!route) { return null; }
    return getFocusedRouteNameFromRoute(route) ?? 'Home';
  });

  const shouldHidePlayer = focusedRouteName === 'Settings';

  const isInAnyPlaylist = useMemo(() => {
    const id = currentTrackId || activeRemoteTrack?.id;
    if (!id || !playlists) return false;
    return playlists.some(p => p.track_ids?.includes(String(id)));
  }, [playlists, currentTrackId, activeRemoteTrack?.id]);

  const hasTrack = Boolean(currentTrackId || activeRemoteTrack);
  const activeSong = songs.find(s => s.id === currentTrackId);
  const currentTitle = activeRemoteTrack?.title || activeSong?.title || 'No track selected';
  const currentArtist = activeRemoteTrack?.artist || activeSong?.artist || 'Start listening...';
  const currentArtwork = activeRemoteTrack?.thumbnail || activeSong?.artwork;
  const currentAlbum = activeRemoteTrack?.album || activeSong?.album;
  const currentDurationMs = activeRemoteTrack?.duration_ms || (activeSong ? 0 : 0); // Local tracks duration handled by useProgress

  // const { position, duration } = useProgress(); // REMOVED: Moved to isolated components
  const [lyricsData, setLyricsData] = useState<{ plainLyrics?: string; syncedLyrics?: string } | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Use a ref to track the last fetched track to avoid redundant fetches
  const lastFetchedTrackRef = useRef<string | null>(null);

  useEffect(() => {
    const trackKey = `${currentTitle}-${currentArtist}`;
    if (currentTitle && currentArtist && currentTitle !== 'No track selected' && trackKey !== lastFetchedTrackRef.current) {
      lastFetchedTrackRef.current = trackKey;

      const task = InteractionManager.runAfterInteractions(() => {
        setLyricsLoading(true);
        // Fallback duration if metadata doesn't have it
        const dms = currentDurationMs;
        const url = `${API_BASE_URL}/lyrics/?title=${encodeURIComponent(currentTitle)}&artist=${encodeURIComponent(currentArtist)}&album=${encodeURIComponent(currentAlbum || '')}&duration_ms=${dms}`;

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
      });
      return () => task.cancel();
    }
  }, [currentTitle, currentArtist, currentAlbum, currentDurationMs]);

  const miniPlayerBottomOffset = 76 + Math.max(insets.bottom, 0); // Reduced from 82 to bring it closer to the lowered tab bar
  const MAX_TRANSLATE = SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - miniPlayerBottomOffset - insets.top; // adjusted for safe area
  const MIN_TRANSLATE = 0;

  const translateY = useSharedValue(MAX_TRANSLATE);
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const isExpanded = useSharedValue(false);
  const showLyrics = useSharedValue(0);
  const scrollY = useSharedValue(0); // For artwork scrolling
  const [isLyricsMode, setIsLyricsMode] = useState(false);

  // Auto-expand or stay collapsed when a track loads?
  // Let's keep it collapsed by default unless user taps it.

  // To snap properly we need the exact height.
  const containerHeight = useSharedValue(SCREEN_HEIGHT);
  const maxTranslateYShared = useDerivedValue(() => {
    return containerHeight.value - MINI_PLAYER_HEIGHT - miniPlayerBottomOffset;
  });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event: any) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // 3D Tilt Sensor
  const sensor = useAnimatedSensor(SensorType.GYROSCOPE, { interval: 20 });

  // For JS side calculations if needed
  const [maxTranslateY, setMaxTranslateY] = useState(SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - miniPlayerBottomOffset);

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
    // Shared values are mutable refs; JS deps are intentionally limited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxTranslateY, snapTo]);

  useEffect(() => {
    if (!isExpanded.value) {
      translateY.value = withSpring(maxTranslateY, BUTTER_SPRING_CONFIG);
    }
    // Shared values are mutable refs; this only reacts to container size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const currentMax = maxTranslateYShared.value;
      const newTranslateY = currentMax + event.translationY;
      translateY.value = Math.max(MIN_TRANSLATE, Math.min(newTranslateY, currentMax));
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentMax = maxTranslateYShared.value;
      if (velocity < -500 || translateY.value < currentMax - 100) {
        snapTo(MIN_TRANSLATE);
      } else {
        snapTo(currentMax);
      }
    });

  // 2. Gesture for FULL PLAYER HEADER (Swipe Down to Minimize)
  const fullPlayerDismissGesture = Gesture.Pan()
    .activeOffsetY([0, 10]) // Only catch downward swipes
    .onUpdate((event) => {
      const currentMax = maxTranslateYShared.value;
      const newTranslateY = MIN_TRANSLATE + event.translationY;
      translateY.value = Math.max(MIN_TRANSLATE, Math.min(newTranslateY, currentMax));
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentMax = maxTranslateYShared.value;
      if (velocity > 500 || translateY.value > MIN_TRANSLATE + 100) {
        snapTo(currentMax);
      } else {
        snapTo(MIN_TRANSLATE);
      }
    });

  const horizontalPanGesture = Gesture.Pan()
    .enabled(hasTrack)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15]) // Don't trigger horizontal if swiping vertical
    .onStart(() => {
      if (!isExpanded.value) { return; }
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      if (isExpanded.value) {
        translateX.value = startTranslateX.value + event.translationX;
      }
    })
    .onEnd((event) => {
      if (!isExpanded.value) { return; }

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
    const mTY = maxTranslateYShared.value;
    // We want the miniplayer to be fully opaque for the last 15px of the transition
    // to avoid layout jitter or safe area changes causing transparency.
    const opacity = interpolate(
      translateY.value,
      [mTY - 60, mTY - 15],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      pointerEvents: translateY.value > mTY - 30 ? 'auto' : 'none',
      zIndex: 10,
    };
  });

  const animatedFullPlayerStyle = useAnimatedStyle(() => {
    const mTY = maxTranslateYShared.value;
    const opacity = interpolate(
      translateY.value,
      [0, mTY * 0.4], // Completely hidden before we reach the bottom half
      [1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      pointerEvents: translateY.value < mTY * 0.6 ? 'auto' : 'none',
      zIndex: 5,
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
        { scale },
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
      marginTop: 0,
      zIndex: 10,
    };
  });

  const animatedArtworkStyle = useAnimatedStyle(() => {
    // Transition progress (0: Mini, 1: Full)
    const p = interpolate(
      translateY.value,
      [maxTranslateYShared.value, 0],
      [0, 1],
      Extrapolation.CLAMP
    );

    const isExpandedVal = interpolate(
      translateY.value,
      [0, maxTranslateYShared.value * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );

    const size = FULL_ARTWORK_SIZE;
    const borderRadius = interpolate(p, [0, 1], [12 / (MINI_ARTWORK_SIZE / FULL_ARTWORK_SIZE), radii.xl]);
    const scale = interpolate(p, [0, 1], [MINI_ARTWORK_SIZE / FULL_ARTWORK_SIZE, 1]);

    // Container is centered horizontally. 
    // miniCenterX is absolute screen position. screenCenterX is screen middle.
    const screenCenterX = SCREEN_WIDTH / 2;
    const miniCenterX = (16 + spacing.sm) + (MINI_ARTWORK_SIZE / 2);

    // Vertical base position (expanded)
    const expandedTop = insets.top + 42;
    const expandedY = expandedTop + (FULL_ARTWORK_SIZE / 2);
    const miniCenterY = 12 + (MINI_ARTWORK_SIZE / 2);

    const artTranslateX = interpolate(p, [0, 1], [miniCenterX - screenCenterX, 0]);
    const artTranslateY = interpolate(p, [0, 1], [miniCenterY - expandedY, 0]) - (scrollY.value * p);

    const rotateX = `${sensor.sensor.value.x * 4 * isExpandedVal}deg`;
    const rotateY = `${sensor.sensor.value.y * 4 * isExpandedVal}deg`;

    return {
      width: size,
      height: size,
      borderRadius,
      marginTop: expandedTop, // Base vertical position
      transform: [
        { translateX: artTranslateX },
        { translateY: artTranslateY },
        { scale },
        { perspective: 1000 },
        { rotateX },
        { rotateY },
        { scale: 1 + (Math.abs(sensor.sensor.value.x) + Math.abs(sensor.sensor.value.y)) * 0.01 * isExpandedVal },
      ],
      shadowColor: '#000',
      shadowOpacity: interpolate(p, [0, 1], [0.1, 0.3]),
      shadowRadius: interpolate(p, [0, 1], [5, 12]),
      elevation: interpolate(p, [0, 1], [4, 12]),
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

  if (shouldHidePlayer) {
    return null;
  }

  // if (!hasTrack) {
  //   return null;
  // }

  return (
    <Animated.View
      style={[styles.sheetContainer, animatedSheetStyle]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        containerHeight.value = h;
        setMaxTranslateY(h - MINI_PLAYER_HEIGHT - miniPlayerBottomOffset);
      }}
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
          <View style={[StyleSheet.absoluteFill, styles.fullPlayerBgFallback]} />
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
          <BouncyPressable
            style={[styles.miniPlayer, { paddingBottom: 8 + Math.max(insets.bottom - 4, 0) }]}
            onPress={() => {
              if (hasTrack) { snapTo(MIN_TRANSLATE); }
            }}
            disabled={!hasTrack}
            scaleTo={0.98}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="extraDark"
              blurAmount={15}
              reducedTransparencyFallbackColor="rgba(20, 20, 20, 0.95)"
            />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
            />
            <View style={styles.miniArtworkPlaceholder} />
            <View style={styles.miniPlayerInfo}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>{currentTitle}</Text>
              <Text style={styles.miniPlayerArtist} numberOfLines={1}>{currentArtist}</Text>
            </View>

            <View style={[styles.miniControls, !hasTrack && styles.miniControlsDisabled]}>
              <BouncyPressable
                style={styles.miniControlBtn}
                onPress={(e: any) => { e.stopPropagation(); if (hasTrack) { previous(); } }}
                disabled={!hasTrack}
                accessibilityRole="button"
                scaleTo={0.85}
              >
                <SkipBack size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </BouncyPressable>
              <BouncyPressable
                style={styles.miniControlBtn}
                onPress={(e: any) => { e.stopPropagation(); if (hasTrack) { togglePlayPause(); } }}
                disabled={!hasTrack}
                accessibilityRole="button"
                scaleTo={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : isPlaying ? (
                  <Pause size={18} color={colors.textPrimary} strokeWidth={2.5} fill={colors.textPrimary} />
                ) : (
                  <Play size={18} color={colors.textPrimary} strokeWidth={2.5} fill={colors.textPrimary} />
                )}
              </BouncyPressable>
              <BouncyPressable
                style={styles.miniControlBtn}
                onPress={(e: any) => { e.stopPropagation(); if (hasTrack) { next(); } }}
                disabled={!hasTrack}
                accessibilityRole="button"
                scaleTo={0.85}
              >
                <SkipForward size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </BouncyPressable>
            </View>
          </BouncyPressable>
        </Animated.View>
      </GestureDetector>

      {/* Morphing Floating Artwork */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', zIndex: 1000 }]} pointerEvents="none">
        <Animated.View
          style={[animatedArtworkStyle, { overflow: 'hidden', elevation: 10 }]}
          renderToHardwareTextureAndroid={true}
        >
          {currentArtwork ? (
            <Image
              source={{ uri: currentArtwork }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.sharedArtworkFallback}>
              <Music size={24} color={colors.textMuted} />
            </View>
          )}
        </Animated.View>
      </View>

      {/* ===================== FULL PLAYER ===================== */}
      <Animated.View style={[styles.fullPlayerWrapper, { paddingTop: insets.top }, animatedFullPlayerStyle]}>
        <GestureDetector gesture={fullPlayerDismissGesture}>
          <View style={styles.header}>
            <BouncyPressable
              onPress={() => snapTo(maxTranslateY)}
              style={styles.dismissBtn}
              scaleTo={0.8}
            >
              <ChevronDown size={32} color={colors.textPrimary} />
            </BouncyPressable>
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
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <GestureDetector gesture={horizontalPanGesture}>
            <Animated.View style={animatedHorizontalContentStyle}>
              <View style={[styles.artworkContainer, styles.artworkPlaceholder]} />

              <View style={styles.trackInfo}>
                <View style={styles.trackTextGroup}>
                  <Text style={styles.title} numberOfLines={1}>{currentTitle}</Text>
                  <Text style={styles.artist} numberOfLines={1}>{currentArtist}</Text>
                </View>

                <View style={styles.rightActions}>
                  <BouncyPressable
                    onPress={() => {
                      const track = activeRemoteTrack || songs.find(s => s.id === currentTrackId);
                      if (track) showAddToPlaylist(track as any);
                    }}
                    style={styles.addPlaylistBtn}
                    scaleTo={0.8}
                  >
                    {isInAnyPlaylist ? (
                      <Check size={28} color={colors.brand} strokeWidth={3} />
                    ) : (
                      <Plus size={28} color={colors.textSecondary} strokeWidth={2} />
                    )}
                  </BouncyPressable>

                  {hasTrack && (
                    <Pressable
                      onPress={() => {
                        const track = activeRemoteTrack || songs.find(s => s.id === currentTrackId);
                        console.log('[PlayerSheet] Heart pressed:', { trackId: track?.id, hasTrack: !!track });
                        if (track) { toggleLike(track as any); }
                      }}
                      style={({ pressed }) => [styles.heartBtn, pressed && { transform: [{ scale: 0.85 }] }]}
                      android_ripple={{ color: 'rgba(255,100,100,0.2)', borderless: true, radius: 24 }}
                      accessibilityRole="button"
                      accessibilityLabel={isLiked(activeRemoteTrack?.id ?? currentTrackId ?? '') ? 'Unlike track' : 'Like track'}
                    >
                      <Heart
                        size={26}
                        color={isLiked(activeRemoteTrack?.id ?? currentTrackId ?? '') ? '#FF4D6D' : colors.textSecondary}
                        fill={isLiked(activeRemoteTrack?.id ?? currentTrackId ?? '') ? '#FF4D6D' : 'none'}
                        strokeWidth={2}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </Animated.View>
          </GestureDetector>

          <View style={styles.playerControlsSection}>
            <ProgressBar />
            <View style={styles.controlsRow}>
              <BouncyPressable
                style={[styles.secondaryControl, isShuffleEnabled && styles.secondaryControlActive]}
                onPress={toggleShuffle}
                scaleTo={0.9}
              >
                <Shuffle size={20} color={isShuffleEnabled ? colors.progressFill : colors.textSecondary} strokeWidth={2} />
              </BouncyPressable>

              <BouncyPressable
                style={styles.skipButton}
                onPress={() => previous()}
                scaleTo={0.9}
              >
                <SkipBack size={28} color={colors.textPrimary} strokeWidth={2} />
              </BouncyPressable>

              <BouncyPressable
                onPress={togglePlayPause}
                disabled={isLoading}
                style={[styles.playButton, isLoading && styles.controlDisabled]}
                scaleTo={0.94}
              >
                {isLoading ? (
                  <ActivityIndicator size="large" color={colors.textPrimary} />
                ) : isPlaying ? (
                  <Pause size={32} color={colors.textPrimary} strokeWidth={3} />
                ) : (
                  <Play size={32} color={colors.textPrimary} strokeWidth={3} />
                )}
              </BouncyPressable>

              <BouncyPressable
                style={styles.skipButton}
                onPress={next}
                scaleTo={0.9}
              >
                <SkipForward size={28} color={colors.textPrimary} strokeWidth={2} />
              </BouncyPressable>

              <BouncyPressable
                style={[styles.secondaryControl, repeatMode !== 'off' && styles.secondaryControlActive]}
                onPress={cycleRepeatMode}
                scaleTo={0.9}
              >
                <Repeat size={20} color={repeatMode !== 'off' ? colors.progressFill : colors.textSecondary} strokeWidth={2} />
                {repeatMode === 'one' ? <Text style={styles.repeatOneLabel}>1</Text> : null}
              </BouncyPressable>
            </View>
          </View>

          <LyricsSection
            lyricsData={lyricsData}
            isLoading={lyricsLoading}
            isLyricsMode={isLyricsMode}
            setIsLyricsMode={setIsLyricsMode}
            showLyrics={showLyrics}
            animatedStyle={animatedLyricsCardStyle}
          />
        </Animated.ScrollView>
      </Animated.View>
    </Animated.View>
  );
}


