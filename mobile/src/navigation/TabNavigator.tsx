import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { InteractionManager, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon, Search as SearchIcon, Library as LibraryIcon, Settings as SettingsIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { colors } from '../theme';
import { MainTabsParamList } from './types';
import { BouncyPressable } from '../components/BouncyPressable';
import { BottomScrim } from '../components/BottomScrim';
import { scanDeviceForAudio } from '../services/audioScanner';
import { saveCachedSongs, saveCachedSongsChunk } from '../services/libraryCache';
import { RemoteTrack } from '../types/music';

const Tab = createBottomTabNavigator<MainTabsParamList>();


function TabBarBlurBackground() {
  return (
    <View style={styles.tabBarBackgroundOuter}>
      <BottomScrim />
      <View style={styles.tabBarBackgroundContainer}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={32}
          reducedTransparencyFallbackColor="rgba(10, 10, 10, 0.95)"
          overlayColor="rgba(0, 0, 0, 0.65)"
        />
      </View>
    </View>
  );
}

function TabBarButton(props: any) {
  return (
    <BouncyPressable
      {...props}
      style={props.style as any}
      scaleTo={0.94}
    />
  );
}

function HomeTabBarIcon({ color }: { color: string }) {
  return <HomeIcon size={22} color={color} strokeWidth={color === colors.brand ? 2.5 : 2} />;
}

function SearchTabBarIcon({ color }: { color: string }) {
  return <SearchIcon size={22} color={color} strokeWidth={color === colors.brand ? 2.5 : 2} />;
}

function LibraryTabBarIcon({ color }: { color: string }) {
  return <LibraryIcon size={22} color={color} strokeWidth={color === colors.brand ? 2.5 : 2} />;
}

function SettingsTabBarIcon({ color }: { color: string }) {
  return <SettingsIcon size={22} color={color} strokeWidth={color === colors.brand ? 2.5 : 2} />;
}

export default function TabNavigator(_props: any) {
  const insets = useSafeAreaInsets();

  const tabBarStyle = useMemo(
    () => ({
      ...styles.tabBar,
      bottom: Math.max(12, insets.bottom),
    }),
    [insets.bottom],
  );

  return (
    <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarBackground: TabBarBlurBackground,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.inactiveIcon,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
          tabBarButton: TabBarButton,
        }}
      >
        <Tab.Screen
          name="Home"
          options={{
            tabBarIcon: HomeTabBarIcon,
          }}
          component={HomeScreen}
        />

        <Tab.Screen
          name="Search"
          options={{
            tabBarIcon: SearchTabBarIcon,
          }}
          component={SearchScreen}
        />

        <Tab.Screen
          name="Library"
          options={{
            tabBarIcon: LibraryTabBarIcon,
          }}
          component={LibraryScreen}
        />

        <Tab.Screen
          name="Settings"
          options={{
            tabBarIcon: SettingsTabBarIcon,
          }}
          component={SettingsScreen}
        />
      </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarBackgroundOuter: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible', // Let the scrim bleed out
    justifyContent: 'flex-end',
  },
  tabBarBackgroundContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 8,
    left: '8%',
    right: '8%',
    bottom: 12,
    height: 68,
    borderRadius: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 600, // Explicitly above the scrim
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 0,
  },
  tabBarItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
});

