import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { ActivityIndicator, Image, View, StyleSheet, Pressable, Text } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Music, Pause, Play, SkipBack, SkipForward} from 'lucide-react-native';
import { TabNavigator } from './TabNavigator';
import { PlayerScreen } from '../screens/PlayerScreen';
import { RootStackParamList } from './types';
import { usePlayback } from '../context/PlaybackContext';
import { colors, radii, spacing } from '../theme';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const insets = useSafeAreaInsets();
  const {
    currentTrackId,
    activeRemoteTrack,
    songs,
    isPlaying,
    togglePlayPause,
    isLoading,
    next,
    previous,
    isShuffleEnabled,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayback();

  const activeSong = songs.find(s => s.id === currentTrackId);
  const activeRouteName = useNavigationState(state => {
    if (!state || !state.routes || state.routes.length === 0) {
      return undefined;
    }

    const safeIndex =
      typeof state.index === 'number' && state.index >= 0 && state.index < state.routes.length
        ? state.index
        : 0;
    const topRoute = state.routes[safeIndex];
    if (!topRoute || topRoute.name !== 'MainTabs') {
      return topRoute?.name;
    }

    const nestedState = topRoute.state;
    if (!nestedState || !('routes' in nestedState) || !('index' in nestedState)) {
      return topRoute.name;
    }

    const nestedIndex = typeof nestedState.index === 'number' ? nestedState.index : 0;
    const nestedRoute = nestedState.routes[nestedIndex];
    return nestedRoute?.name ?? topRoute.name;
  });

  const showMiniPlayer =
    Boolean(currentTrackId || activeRemoteTrack) && activeRouteName !== 'Player';

  return (
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="Player">
          {(props: any) => {
            const currentSong = activeSong || songs[0];
            const currentSongIndex = songs.findIndex(s => s.id === (activeSong?.id || ''));

            return (
              <PlayerScreen
                {...props}
                currentTitle={activeRemoteTrack?.title || currentSong?.title || 'No track selected'}
                currentArtist={activeRemoteTrack?.artist || currentSong?.artist || 'Unknown Artist'}
                currentPath={activeRemoteTrack ? 'remote' : currentSong?.path}
                currentThumbnail={activeRemoteTrack?.thumbnail || activeSong?.artwork}
                currentAlbum={activeSong?.album}
                queueSize={songs.length}
                currentIndex={currentSongIndex >= 0 ? currentSongIndex + 1 : 0}
                isReady={true}
                isPlaying={isPlaying}
                isLoading={isLoading}
                onTogglePlayPause={togglePlayPause}
                onNext={next}
                onPrevious={previous}
                isShuffleEnabled={isShuffleEnabled}
                repeatMode={repeatMode}
                onToggleShuffle={toggleShuffle}
                onCycleRepeatMode={cycleRepeatMode}
              />
            );
          }}
        </Stack.Screen>
      </Stack.Navigator>

      {/* Persistent Mini-Player Overlay */}
      {showMiniPlayer && (
        <View style={styles.miniPlayerContainer}>
          <MiniPlayer
            title={activeRemoteTrack?.title || activeSong?.title}
            artist={activeRemoteTrack?.artist || activeSong?.artist}
            artwork={activeRemoteTrack?.thumbnail || activeSong?.artwork}
            isPlaying={isPlaying}
            isLoading={isLoading}
            onToggle={togglePlayPause}
            onNext={next}
            onPrevious={previous}
            bottomInset={insets.bottom}
          />
        </View>
      )}
    </View>
  );
}

function MiniPlayer({
  title,
  artist,
  artwork,
  isPlaying,
  isLoading,
  onToggle,
  onNext,
  onPrevious,
  bottomInset,
}: any) {
  const navigation = useNavigation<any>();

  return (
    <Pressable
      style={[styles.miniPlayer, {paddingBottom: spacing.sm + Math.max(bottomInset - 4, 0)}]}
      onPress={() => navigation.navigate('Player')}
    >
      {artwork ? (
        <Image source={{uri: artwork}} style={styles.miniArtwork} />
      ) : (
        <View style={styles.miniArtworkFallback}>
          <Music size={18} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.miniPlayerInfo}>
        <Text style={styles.miniPlayerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.miniPlayerArtist} numberOfLines={1}>{artist}</Text>
      </View>

      <View style={styles.miniControls}>
        <Pressable style={styles.miniControlBtn} onPress={onPrevious} accessibilityRole="button">
          <SkipBack size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
        <Pressable style={styles.miniControlBtn} onPress={onToggle} accessibilityRole="button">
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : isPlaying ? (
            <Pause size={20} color={colors.textPrimary} strokeWidth={2.5} fill={colors.textPrimary} />
          ) : (
            <Play size={20} color={colors.textPrimary} strokeWidth={2.5} fill={colors.textPrimary} />
          )}
        </Pressable>
        <Pressable style={styles.miniControlBtn} onPress={onNext} accessibilityRole="button">
          <SkipForward size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'transparent',
  },
  miniPlayer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  miniArtwork: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
  },
  miniArtworkFallback: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
    backgroundColor: '#3B3B3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  miniPlayerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  miniPlayerArtist: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniControlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
