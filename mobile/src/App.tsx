import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppInitializer } from './components/AppInitializer';
import { useAuthStore } from './store/authStore';
import RootNavigator from './navigation/RootNavigator';
import { LoginScreen } from './screens/LoginScreen';
import { colors } from './theme';

function NavigationWrapper() {
  const user = useAuthStore(state => state.user);
  const loading = useAuthStore(state => state.loading);
  const isGuest = useAuthStore(state => state.isGuest);

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
        <AppInitializer>
          <NavigationWrapper />
        </AppInitializer>
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
