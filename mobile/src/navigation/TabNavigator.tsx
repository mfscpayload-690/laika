import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon, Search as SearchIcon, Library as LibraryIcon } from 'lucide-react-native';

import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { colors, spacing } from '../theme';
import { MainTabsParamList } from './types';
import { usePlayback } from '../context/PlaybackContext';
import { ensureAudioPermission, scanDeviceForAudio } from '../services/audioScanner';
import { saveCachedSongs } from '../services/libraryCache';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function TabNavigator() {
  const { 
    songs, 
    setSongs, 
    playSong, 
    playRemote, 
    currentTrackId, 
    activeRemoteTrack,
    isLoading
  } = usePlayback();
  
  const [scanning, setScanning] = React.useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      const foundSongs = await scanDeviceForAudio();
      setSongs(foundSongs);
      await saveCachedSongs(foundSongs);
    } catch (error) {
      console.error(error);
    } finally {
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
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm + 2,
          height: 60,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.inactiveIcon,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
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
            hasCurrentSong={Boolean(currentTrackId) || Boolean(activeRemoteTrack)}
            nowPlayingTitle={activeRemoteTrack?.title || songs.find(s => s.id === currentTrackId)?.title}
            nowPlayingArtist={activeRemoteTrack?.artist || songs.find(s => s.id === currentTrackId)?.artist}
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
            onOpenPlayer={() => props.navigation.navigate('Player')}
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
