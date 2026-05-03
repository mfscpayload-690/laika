import React from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCRIM_HEIGHT = 220; // Height of the dark void

export const BottomScrim = () => {
  const OVERSIZED_WIDTH = SCREEN_WIDTH * 1.2;
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg height={SCRIM_HEIGHT} width={OVERSIZED_WIDTH}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            {/* Start transparent at the top */}
            <Stop offset="0" stopColor="black" stopOpacity="0" />
            {/* Fade in slowly */}
            <Stop offset="0.4" stopColor="black" stopOpacity="0.5" />
            {/* Deepen significantly behind the player */}
            <Stop offset="0.7" stopColor="black" stopOpacity="0.9" />
            {/* Solid black at the absolute bottom edge */}
            <Stop offset="1" stopColor="black" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={OVERSIZED_WIDTH} height={SCRIM_HEIGHT} fill="url(#grad)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: -20, // Bleed into safe area
    left: '-10%', // Oversized left to ensure no gaps
    width: '120%', // Oversized width for perfect coverage
    height: SCRIM_HEIGHT,
    zIndex: -1, // Behind the BlurView of the TabBar
  },
});
