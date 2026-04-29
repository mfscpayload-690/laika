import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { TabNavigator } from './TabNavigator';
import { PlayerScreen } from '../screens/PlayerScreen';
import { RootStackParamList } from './types';
import { usePlayback } from '../context/PlaybackContext';
import { colors, radii, spacing } from '../theme';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
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
            isPlaying={isPlaying}
            onToggle={togglePlayPause}
          />
        </View>
      )}
    </View>
  );
}

function MiniPlayer({ title, artist, isPlaying, onToggle }: any) {
  const navigation = useNavigation<any>();

  return (
    <Pressable
      style={styles.miniPlayer}
      onPress={() => navigation.navigate('Player')}
    >
      <View style={styles.miniPlayerInfo}>
        <Text style={styles.miniPlayerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.miniPlayerArtist} numberOfLines={1}>{artist}</Text>
      </View>
      <Pressable style={styles.miniPlayerBtn} onPress={onToggle}>
        {isPlaying ? (
          <View style={styles.miniPauseBars}>
            <View style={styles.miniPauseBar} />
            <View style={styles.miniPauseBar} />
          </View>
        ) : (
          <View style={styles.miniPlayTriangle} />
        )}
      </Pressable>
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
    bottom: 60, // Above bottom tabs
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'transparent',
  },
  miniPlayer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  miniPlayerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  miniPlayerTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  miniPlayerArtist: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  miniPlayerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPauseBars: {
    flexDirection: 'row',
    gap: 3,
  },
  miniPauseBar: {
    width: 3,
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 1,
  },
  miniPlayTriangle: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 10,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: colors.background,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
