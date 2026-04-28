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
  const iconColor = selected ? colors.skyLight : colors.textSecondary;

  return (
    <Pressable
      style={[styles.tab, selected && styles.tabSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Icon size={18} color={iconColor} style={{ marginBottom: 4 }} />
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

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#031019" />

      <View style={styles.backdropOrbOne} pointerEvents="none" />
      <View style={styles.backdropOrbTwo} pointerEvents="none" />

      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>LAIKA</Text>
        </View>
        <View style={styles.modePill}>
          <Text style={styles.modePillLabel}>Offline Ready</Text>
        </View>
      </View>

      <View style={styles.content}>
        <FadeScreen screenKey={screen}>
          {renderScreen()}
        </FadeScreen>
      </View>

      {scanError ? <Text style={styles.error}>{scanError}</Text> : null}

      {/* Mini-player — Spotify-style footer, above nav bar */}
      {(activeSong || remoteActiveTrack) ? (
        <Pressable
          style={styles.nowPlayingCard}
          onPress={() => setScreen('player')}
          accessibilityRole="button"
          accessibilityLabel="Now playing — tap to open player">
          <View style={styles.nowPlayingAccentBar} />
          <View style={styles.nowPlayingContent}>
            <Text style={styles.nowPlayingKicker}>
              NOW PLAYING{remoteStatus === 'resolving' ? '  ·  Resolving...' : ''}
            </Text>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>
              {activeSong?.title ?? remoteActiveTrack?.title}
            </Text>
            <Text style={styles.nowPlayingArtist} numberOfLines={1}>
              {activeSong?.artist ?? remoteActiveTrack?.artist}
            </Text>
            {remoteError ? (
              <Text style={styles.remoteError}>{remoteError}</Text>
            ) : null}
          </View>
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
    backgroundColor: '#031019',
  },
  backdropOrbOne: {
    position: 'absolute',
    right: -60,
    top: -30,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#1d4ed8',
    opacity: 0.28,
  },
  backdropOrbTwo: {
    position: 'absolute',
    left: -80,
    bottom: 140,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.orange,
    opacity: 0.18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 26,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  modePill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  modePillLabel: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nowPlayingCard: {
    marginHorizontal: spacing.sm + 2,
    marginBottom: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBlueBorder,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  nowPlayingAccentBar: {
    width: 3,
    backgroundColor: colors.brand,
    borderTopLeftRadius: radii.xl,
    borderBottomLeftRadius: radii.xl,
  },
  nowPlayingContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
  },
  nowPlayingKicker: {
    ...typography.label,
    color: colors.textSecondary,
  },
  nowPlayingTitle: {
    marginTop: spacing.sm - 2,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  nowPlayingArtist: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  remoteError: {
    color: colors.error,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    marginTop: spacing.xs,
  },
  navBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm + 2,
    paddingTop: spacing.sm + 2,
    paddingBottom: 6,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.navBg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderAccent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.tabBg,
  },
  tabSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.deepBlue,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelSelected: {
    color: colors.skyLight,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    fontSize: 12,
  },
});
