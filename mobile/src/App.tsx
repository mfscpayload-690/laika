import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Home, Library, Music, Search } from 'lucide-react-native';

import { useRemotePlayer } from './hooks/useRemotePlayer';
import { useTrackPlayer } from './hooks/useTrackPlayer';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ensureAudioPermission, scanDeviceForAudio } from './services/audioScanner';
import { loadCachedSongs, saveCachedSongs } from './services/libraryCache';
import { colors, radii, spacing, typography } from './theme';
import type { LocalSong, RemoteTrack } from './types/music';

const PERMISSION_DENIED_MESSAGE =
  'Audio access is required to read local songs. Allow access in the permission prompt or Android settings.';

type ScreenKey = 'home' | 'search' | 'library' | 'player';

type ScreenTab = {
  key: ScreenKey;
  label: string;
  Icon: React.ElementType;
};

const SCREENS: ScreenTab[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'search', label: 'Search', Icon: Search },
  { key: 'library', label: 'Library', Icon: Library },
  { key: 'player', label: 'Player', Icon: Music },
];

type ScreenTabButtonProps = {
  label: string;
  selected: boolean;
  Icon: React.ElementType;
  onPress: () => void;
};

function ScreenTabButton({ label, selected, Icon, onPress }: ScreenTabButtonProps) {
  const iconColor = selected ? colors.textPrimary : colors.inactiveIcon;

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Icon size={22} color={iconColor} style={{ marginBottom: 4 }} />
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function FadeScreen({ children, screenKey }: { children: React.ReactNode; screenKey: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [screenKey, opacity]);

  return (
    <Animated.View style={{ flex: 1, opacity }}>
      {children}
    </Animated.View>
  );
}

export function LaikaApp() {
  const [songs, setSongs] = useState<LocalSong[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [screen, setScreen] = useState<ScreenKey>('home');

  const {
    currentTrackId,
    isPlaying: localIsPlaying,
    isLoading: localIsLoading,
    isReady,
    togglePlayPause: localTogglePlayPause,
    next,
    previous,
    playSong,
  } = useTrackPlayer(songs);

  const {
    status: remoteStatus,
    error: remoteError,
    activeTrack: remoteActiveTrack,
    isPlaying: remoteIsPlaying,
    isLoading: remoteIsLoading,
    play: playRemote,
    togglePlayPause: remoteTogglePlayPause,
  } = useRemotePlayer();

  useEffect(() => {
    const initializeApp = async () => {
      const cachedSongs = await loadCachedSongs();
      if (cachedSongs.length > 0) {
        setSongs(cachedSongs);
      }

      const granted = await ensureAudioPermission();
      if (!granted) {
        setScanError(PERMISSION_DENIED_MESSAGE);
      }
    };

    void initializeApp();
  }, []);

  const activeSong = useMemo(
    () => songs.find(song => song.id === currentTrackId),
    [songs, currentTrackId],
  );

  const currentSong = useMemo(() => activeSong ?? songs[0], [activeSong, songs]);

  const currentSongIndex = useMemo(() => {
    if (!currentSong) return -1;
    return songs.findIndex(song => song.id === currentSong.id);
  }, [songs, currentSong]);

  const handleScan = async () => {
    setScanning(true);
    setScanError(null);

    try {
      const foundSongs = await scanDeviceForAudio();
      setSongs(foundSongs);
      await saveCachedSongs(foundSongs);
      if (foundSongs.length > 0) {
        setScreen('library');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan device';
      setScanError(message === 'Audio permission denied' ? PERMISSION_DENIED_MESSAGE : message);
    } finally {
      setScanning(false);
    }
  };

  const handleRemoteTrackSelect = async (track: RemoteTrack) => {
    await playRemote(track);
    setScreen('player');
  };

  const handleSongPress = async (songId: string, openPlayer: boolean) => {
    await playSong(songId);
    if (openPlayer) {
      setScreen('player');
    }
  };

  const renderScreen = () => {
    if (screen === 'home') {
      return (
        <HomeScreen
          songsCount={songs.length}
          onScan={handleScan}
          scanning={scanning}
          onOpenLibrary={() => setScreen('library')}
          onOpenPlayer={() => setScreen('player')}
          hasCurrentSong={Boolean(activeSong) || Boolean(remoteActiveTrack)}
          nowPlayingTitle={activeSong?.title ?? remoteActiveTrack?.title}
          nowPlayingArtist={activeSong?.artist ?? remoteActiveTrack?.artist}
          nowPlayingThumbnail={remoteActiveTrack?.thumbnail}
          onOpenSearch={() => setScreen('search')}
        />
      );
    }

    if (screen === 'search') {
      return (
        <SearchScreen
          onSelectTrack={track => {
            void handleRemoteTrackSelect(track);
          }}
          resolvingId={remoteStatus === 'resolving' ? (remoteActiveTrack?.id ?? null) : null}
          activeTrackId={remoteActiveTrack?.id ?? null}
          onOpenPlayer={() => setScreen('player')}
        />
      );
    }

    if (screen === 'library') {
      return (
        <LibraryScreen
          songs={songs}
          currentTrackId={currentTrackId}
          onPressSong={songId => {
            void handleSongPress(songId, true);
          }}
          onOpenPlayer={() => setScreen('player')}
          onScan={handleScan}
        />
      );
    }

    const isRemoteActive = Boolean(remoteActiveTrack);
    const isPlaying = isRemoteActive ? remoteIsPlaying : localIsPlaying;
    const isLoading = isRemoteActive ? remoteIsLoading : localIsLoading;
    const handleToggle = isRemoteActive ? remoteTogglePlayPause : localTogglePlayPause;

    return (
      <PlayerScreen
        currentTitle={remoteActiveTrack?.title ?? currentSong?.title ?? 'No track selected'}
        currentArtist={remoteActiveTrack?.artist ?? currentSong?.artist ?? 'Unknown Artist'}
        currentPath={remoteActiveTrack ? 'remote' : currentSong?.path}
        currentThumbnail={remoteActiveTrack?.thumbnail ?? activeSong?.artwork ?? undefined}
        currentAlbum={activeSong?.album}
        queueSize={songs.length}
        currentIndex={currentSongIndex >= 0 ? currentSongIndex + 1 : 0}
        isReady={isReady}
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlayPause={handleToggle}
        onNext={next}
        onPrevious={previous}
      />
    );
  };

  const isRemoteActive = Boolean(remoteActiveTrack);
  const isPlaying = isRemoteActive ? remoteIsPlaying : localIsPlaying;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {screen !== 'player' && (
        <View style={styles.header}>
          <Text style={styles.brand}>Laika Music</Text>
        </View>
      )}

      <View style={styles.content}>
        <FadeScreen screenKey={screen}>
          {renderScreen()}
        </FadeScreen>
      </View>

      {scanError ? <Text style={styles.error}>{scanError}</Text> : null}

      {/* Mini-player — Spotify-style floating bar */}
      {(activeSong || remoteActiveTrack) && screen !== 'player' ? (
        <Pressable
          style={styles.miniPlayer}
          onPress={() => setScreen('player')}
          accessibilityRole="button"
          accessibilityLabel="Now playing — tap to open player">
          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              {activeSong?.title ?? remoteActiveTrack?.title}
            </Text>
            <Text style={styles.miniPlayerArtist} numberOfLines={1}>
              {activeSong?.artist ?? remoteActiveTrack?.artist}
            </Text>
          </View>
          <Pressable
            style={styles.miniPlayerBtn}
            onPress={e => {
              e.stopPropagation();
              const toggle = isRemoteActive ? remoteTogglePlayPause : localTogglePlayPause;
              toggle();
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <View style={styles.miniPauseBars}>
                <View style={styles.miniPauseBar} />
                <View style={styles.miniPauseBar} />
              </View>
            ) : (
              <View style={styles.miniPlayTriangle} />
            )}
          </Pressable>
          {remoteError ? (
            <Text style={styles.miniPlayerError}>{remoteError}</Text>
          ) : null}
        </Pressable>
      ) : null}

      <View style={styles.navBar}>
        {SCREENS.map(tab => (
          <ScreenTabButton
            key={tab.key}
            label={tab.label}
            Icon={tab.Icon}
            selected={screen === tab.key}
            onPress={() => setScreen(tab.key)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  // Mini-player (Spotify floating bar)
  miniPlayer: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '400',
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
  miniPlayerError: {
    color: colors.error,
    fontSize: 10,
    marginLeft: spacing.sm,
  },
  // Bottom navigation
  navBar: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    color: colors.inactiveIcon,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelSelected: {
    color: colors.textPrimary,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    fontSize: 12,
  },
});
