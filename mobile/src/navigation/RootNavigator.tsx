import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import TabNavigator from './TabNavigator';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import LocalSongsScreen from '../screens/LocalSongsScreen';
import LikedSongsScreen from '../screens/LikedSongsScreen';
import { PlayerSheet } from '../components/PlayerSheet';
import { RootStackParamList } from './types';
import { colors } from '../theme';


const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="LocalSongs"
          component={LocalSongsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="LikedSongs" 
          component={LikedSongsScreen}
          options={{ animation: 'slide_from_right' }}
        />
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
