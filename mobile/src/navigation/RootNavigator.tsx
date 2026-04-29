import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { TabNavigator } from './TabNavigator';
import { PlayerSheet } from '../components/PlayerSheet';
import { RootStackParamList } from './types';
import { colors } from '../theme';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      </Stack.Navigator>

      <PlayerSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
