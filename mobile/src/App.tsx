import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PlaybackProvider } from './context/PlaybackContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LikesProvider } from './context/LikesContext';
import { RootNavigator } from './navigation/RootNavigator';
import { LoginScreen } from './screens/LoginScreen';
import { PlaylistProvider } from './context/PlaylistContext';
import { UIProvider } from './context/UIContext';
import { MusicStateProvider } from './context/MusicStateContext';
import { colors } from './theme';

function NavigationWrapper() {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return null; // Or a splash screen
  }

  if (!user && !isGuest) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
        translucent={false}
      />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <RootNavigator />
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <PlaybackProvider>
            <LikesProvider>
            <PlaylistProvider>
              <MusicStateProvider>
                <UIProvider>
                  <NavigationWrapper />
                </UIProvider>
              </MusicStateProvider>
            </PlaylistProvider>
            </LikesProvider>
          </PlaybackProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
