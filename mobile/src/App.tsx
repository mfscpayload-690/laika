import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PlaybackProvider } from './context/PlaybackContext';
import { RootNavigator } from './navigation/RootNavigator';
import { colors } from './theme';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlaybackProvider>
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
        </PlaybackProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
