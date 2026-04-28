import {Home, Library, Music, Search} from 'lucide-react-native';

import {useTrackPlayer} from './hooks/useTrackPlayer';
import {HomeScreen} from './screens/HomeScreen';
import {LibraryScreen} from './screens/LibraryScreen';
import {PlayerScreen} from './screens/PlayerScreen';
import {SearchScreen} from './screens/SearchScreen';
import {ensureAudioPermission, scanDeviceForAudio} from './services/audioScanner';
import {loadCachedSongs, saveCachedSongs} from './services/libraryCache';
import type {LocalSong} from './types/music';

const PERMISSION_DENIED_MESSAGE =
  'Audio access is required to read local songs. Allow access in the permission prompt or Android settings.';

type ScreenKey = 'home' | 'search' | 'library' | 'player';

type ScreenTab = {
  key: ScreenKey;
  label: string;
  hint: string;
  Icon: React.ElementType;
};

const SCREENS: ScreenTab[] = [
  {key: 'home', label: 'Home', hint: 'Launchpad', Icon: Home},
  {key: 'search', label: 'Search', hint: 'Find tracks', Icon: Search},
  {key: 'library', label: 'Library', hint: 'Device songs', Icon: Library},
  {key: 'player', label: 'Player', hint: 'Now playing', Icon: Music},
];

type ScreenTabButtonProps = {
  label: string;
  hint: string;
  selected: boolean;
  Icon: React.ElementType;
  onPress: () => void;
};

function ScreenTabButton({label, hint, selected, Icon, onPress}: ScreenTabButtonProps) {
  const iconColor = selected ? '#e0f2fe' : '#cbd5e1';

  return (
    <Pressable
      style={[styles.tab, selected && styles.tabSelected]}
      onPress={onPress}
      accessibilityRole="button">
      <Icon size={18} color={iconColor} style={{marginBottom: 4}} />
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{label}</Text>
      <Text style={[styles.tabHint, selected && styles.tabHintSelected]}>{hint}</Text>
    </Pressable>
  );
}

export function LaikaApp() {
  const [songs, setSongs] = useState<LocalSong[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [screen, setScreen] = useState<ScreenKey>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const {currentTrackId, isPlaying, isReady, play, pause, next, previous, playSong} =
    useTrackPlayer(songs);

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
    if (!currentSong) {
      return -1;
    }

    return songs.findIndex(song => song.id === currentSong.id);
  }, [songs, currentSong]);

  const filteredSongs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return songs;
    }

    return songs.filter(song => {
      const joined = `${song.title} ${song.artist}`.toLowerCase();
      return joined.includes(normalizedQuery);
    });
  }, [songs, searchQuery]);

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
          hasCurrentSong={Boolean(activeSong)}
        />
      );
    }

    if (screen === 'search') {
      return (
        <SearchScreen
          songs={filteredSongs}
          totalSongs={songs.length}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          currentTrackId={currentTrackId}
          onPressSong={songId => {
            void handleSongPress(songId, true);
          }}
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
        />
      );
    }

    return (
      <PlayerScreen
        currentTitle={currentSong?.title ?? 'No track selected'}
        currentArtist={currentSong?.artist ?? 'Unknown Artist'}
        currentPath={currentSong?.path}
        queueSize={songs.length}
        currentIndex={currentSongIndex >= 0 ? currentSongIndex + 1 : 0}
        isReady={isReady}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
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
          <Text style={styles.brandSubtitle}>Phase 1 Local-First UX</Text>
        </View>
        <View style={styles.modePill}>
          <Text style={styles.modePillLabel}>Offline Ready</Text>
        </View>
      </View>

      {activeSong ? (
        <Pressable
          style={styles.nowPlayingCard}
          onPress={() => setScreen('player')}
          accessibilityRole="button">
          <Text style={styles.nowPlayingKicker}>NOW PLAYING</Text>
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>
            {activeSong.title}
          </Text>
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>
            {activeSong.artist}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.nowPlayingCardMuted}>
          <Text style={styles.nowPlayingKicker}>NOW PLAYING</Text>
          <Text style={styles.nowPlayingEmpty}>No active song yet. Scan and pick a track.</Text>
        </View>
      )}

      <View style={styles.content}>{renderScreen()}</View>

      {scanError ? <Text style={styles.error}>{scanError}</Text> : null}

      <View style={styles.navBar}>
        {SCREENS.map(tab => (
          <ScreenTabButton
            key={tab.key}
            label={tab.label}
            hint={tab.hint}
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
    backgroundColor: '#f97316',
    opacity: 0.18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 26,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  brandSubtitle: {
    marginTop: 2,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#0f172a',
  },
  modePillLabel: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nowPlayingCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    backgroundColor: '#0b1a2e',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nowPlayingCardMuted: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nowPlayingKicker: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nowPlayingTitle: {
    marginTop: 6,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  nowPlayingArtist: {
    marginTop: 2,
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  nowPlayingEmpty: {
    marginTop: 6,
    color: '#9ca3af',
    fontSize: 13,
  },
  content: {
    flex: 1,
    marginTop: 12,
  },
  navBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#020617',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 8,
    backgroundColor: '#0b1220',
  },
  tabSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#082f49',
  },
  tabLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelSelected: {
    color: '#e0f2fe',
  },
  tabHint: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  tabHintSelected: {
    color: '#7dd3fc',
  },
  error: {
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
    fontSize: 12,
  },
});
