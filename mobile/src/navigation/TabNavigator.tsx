import React from 'react';
import {InteractionManager} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon, Search as SearchIcon, Library as LibraryIcon } from 'lucide-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { colors } from '../theme';
import { MainTabsParamList } from './types';
import { usePlayback } from '../context/PlaybackContext';
import {scanDeviceForAudio} from '../services/audioScanner';
import { saveCachedSongs, saveCachedSongsChunk } from '../services/libraryCache';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const TAB_BAR_BASE_HEIGHT = 62;

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const {
    songs,
    setSongs,
    playSong,
    playRemote,
    currentTrackId,
    activeRemoteTrack,
    isLoading,
  } = usePlayback();

  const [scanning, setScanning] = React.useState(false);
  const lastChunkSaveRef = React.useRef(0);
  const activeLocalSong = React.useMemo(
    () => songs.find(song => song.id === currentTrackId),
    [songs, currentTrackId],
  );
  const hasCurrentSong = Boolean(currentTrackId) || Boolean(activeRemoteTrack);

  const handleScan = async () => {
    setScanning(true);
    const scanPerfStart = Date.now();
    if (__DEV__) {
      console.log('[perf] scan:start');
    }

    try {
      const foundSongs = await scanDeviceForAudio({
        incrementalRefresh: true,
        chunkSize: 120,
        onChunk: chunkSongs => {
          InteractionManager.runAfterInteractions(() => {
            setSongs(chunkSongs);
          });

          const now = Date.now();
          if (now - lastChunkSaveRef.current > 1200) {
            lastChunkSaveRef.current = now;
            saveCachedSongsChunk(chunkSongs).catch(() => undefined);
          }
        },
      });
      InteractionManager.runAfterInteractions(() => {
        setSongs(foundSongs);
      });
      await saveCachedSongs(foundSongs);
    } catch (error) {
      console.error(error);
    } finally {
      if (__DEV__) {
        const elapsed = Date.now() - scanPerfStart;
        console.log(`[perf] scan:start->finish ${elapsed}ms`);
      }
      setScanning(false);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Math.max(6, insets.bottom),
          height: TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 0),
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.inactiveIcon,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} />,
        }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            songsCount={songs.length}
            onScan={handleScan}
            scanning={scanning}
            onOpenLibrary={() => props.navigation.navigate('Library')}
            onOpenPlayer={() => props.navigation.navigate('Player')}
            hasCurrentSong={hasCurrentSong}
            nowPlayingTitle={activeRemoteTrack?.title || activeLocalSong?.title}
            nowPlayingArtist={activeRemoteTrack?.artist || activeLocalSong?.artist}
            nowPlayingThumbnail={activeRemoteTrack?.thumbnail}
            onOpenSearch={() => props.navigation.navigate('Search')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Search"
        options={{
          tabBarIcon: ({ color }) => <SearchIcon size={22} color={color} />,
        }}
      >
        {(props) => (
          <SearchScreen
            {...props}
            onSelectTrack={playRemote}
            resolvingId={isLoading ? activeRemoteTrack?.id || null : null}
            activeTrackId={activeRemoteTrack?.id || null}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Library"
        options={{
          tabBarIcon: ({ color }) => <LibraryIcon size={22} color={color} />,
        }}
      >
        {(props) => (
          <LibraryScreen
            {...props}
            songs={songs}
            currentTrackId={currentTrackId}
            onPressSong={(id) => playSong(id)}
            onOpenPlayer={() => props.navigation.navigate('Player')}
            onScan={handleScan}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
