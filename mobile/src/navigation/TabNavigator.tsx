import React from 'react';
import {InteractionManager, Pressable, View, StyleSheet, Text} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon, Search as SearchIcon, Library as LibraryIcon, Settings as SettingsIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';

import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { colors } from '../theme';
import { MainTabsParamList } from './types';
import { usePlayback } from '../context/PlaybackContext';
import {scanDeviceForAudio} from '../services/audioScanner';
import { saveCachedSongs, saveCachedSongsChunk } from '../services/libraryCache';

const Tab = createBottomTabNavigator<MainTabsParamList>();

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
    isResolving,
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
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          left: '10%',
          right: '10%',
          bottom: 20 + Math.max(0, insets.bottom),
          height: 64,
          borderRadius: 32,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'hidden' }]}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={25}
              reducedTransparencyFallbackColor="rgba(18, 18, 18, 0.9)"
              overlayColor="rgba(0, 0, 0, 0.5)"
            />
          </View>
        ),
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
        tabBarButton: (props) => (
          <Pressable
            {...props}
            android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true, radius: 32 }}
            style={({ pressed }) => [
              props.style as any,
              pressed && { opacity: 0.7 }
            ]}
          />
        ),
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
            onOpenPlayer={() => { /* Player is a global sheet */ }}
            hasCurrentSong={hasCurrentSong}
            nowPlayingTitle={activeRemoteTrack?.title || activeLocalSong?.title}
            nowPlayingArtist={activeRemoteTrack?.artist || activeLocalSong?.artist}
            nowPlayingThumbnail={activeRemoteTrack?.thumbnail}
            onOpenSearch={() => props.navigation.navigate('Search')}
            onOpenProfile={() => props.navigation.navigate('Settings')}
            onPlayTrack={playRemote}
            currentTrackId={currentTrackId}
            activeRemoteTrackId={activeRemoteTrack?.id}
            resolvingId={isResolving ? activeRemoteTrack?.id : null}
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
            resolvingId={isResolving ? activeRemoteTrack?.id || null : null}
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
            onOpenPlayer={() => { /* Player is a global sheet */ }}
            onScan={handleScan}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ color }) => <SettingsIcon size={22} color={color} />,
        }}
      >
        {() => (
          <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
            <SettingsIcon size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>Settings Page (Coming Soon)</Text>
          </View>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
