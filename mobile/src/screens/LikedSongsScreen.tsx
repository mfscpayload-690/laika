import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Play, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { useLikesStore } from '../store/likesStore';
import { useMusicStore } from '../store/musicStore';
import { useUIStore } from '../store/uiStore';
import { SongList } from '../components/SongList';
import { colors, radii, spacing, typography } from '../theme';

const HEADER_MAX_HEIGHT = 300;
const HEADER_MIN_HEIGHT = 100;
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function LikedSongsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const likedTracks = useLikesStore(state => state.likedTracks);
  const currentTrackId = useMusicStore(state => state.currentTrackId);
  const onPlayTrack = useMusicStore(state => state.playRemote);
  const showAddToPlaylist = useUIStore(state => state.showAddToPlaylist);

  // Reanimated scroll value
  const scrollY = useSharedValue(0);

  // Convert LikedTrack to the format SongList expects
  const tracks = useMemo(() => {
    return likedTracks.map(lt => ({
      id: lt.track_id,
      title: lt.track_metadata.title,
      artist: lt.track_metadata.artist,
      album: lt.track_metadata.album,
      thumbnail: lt.track_metadata.artwork,
      artwork: lt.track_metadata.artwork,
      duration_ms: lt.track_metadata.duration ?? 0,
      url: '',
      source: lt.track_metadata.source,
    }));
  }, [likedTracks]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      onPlayTrack(tracks[0] as any, tracks as any[], 0);
    }
  };

  const handleTrackPress = (track: any) => {
    const index = tracks.findIndex(t => t.id === track.id);
    onPlayTrack(track, tracks as any[], index);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Reanimated Styles
  const headerBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_DISTANCE * 0.7, SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const artStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0, SCROLL_DISTANCE],
      [1.2, 1, 0.6],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE / 2, SCROLL_DISTANCE],
      [1, 0.8, 0],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.container}>
      {/* Animated Header Background */}
      <Animated.View 
        style={[
          styles.headerBg, 
          { height: insets.top + 56 },
          headerBgStyle
        ]} 
      />

      {/* Static Header Controls */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={colors.textPrimary} size={28} />
        </Pressable>
        <Animated.Text style={[styles.title, headerTitleStyle]}>
          Liked Songs
        </Animated.Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Track List with Integrated Hero */}
      <SongList
        songs={tracks as any}
        currentTrackId={currentTrackId ?? undefined}
        onPressSong={(id) => {
           const track = tracks.find(t => t.id === id);
           if (track) handleTrackPress(track);
        }}
        onLongPressSong={showAddToPlaylist}
        onScroll={scrollHandler}
        ListHeaderComponent={
          <Animated.View style={[styles.hero, artStyle]}>
            <View style={styles.artContainer}>
              <View style={styles.heartCircle}>
                <Heart size={48} color="#fff" fill="#fff" />
              </View>
            </View>
            <Text style={styles.countText}>{tracks.length} tracks • Favorites</Text>
            
            <Pressable style={styles.playBtn} onPress={handlePlayAll}>
              <Play size={24} color="#fff" fill="#fff" />
              <Text style={styles.playBtnText}>Play All</Text>
            </Pressable>
          </Animated.View>
        }
        contentContainerStyle={styles.scrollContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: colors.background,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 100,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 20,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: spacing.xl,
  },
  artContainer: {
    width: 200, height: 200, borderRadius: radii.xl,
    backgroundColor: 'rgba(255, 75, 43, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 15,
    shadowColor: '#ff4b2b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 18,
  },
  heartCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#ff4b2b',
    justifyContent: 'center', alignItems: 'center',
  },
  countText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    fontSize: 14,
  },
  playBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: radii.full,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10,
  },
  playBtnText: {
    color: '#fff', marginLeft: spacing.sm,
    fontSize: 16, fontWeight: '800',
  },
});
