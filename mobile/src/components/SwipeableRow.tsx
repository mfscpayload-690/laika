import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Heart, Plus } from 'lucide-react-native';
import { colors, spacing } from '../theme';

const SWIPE_THRESHOLD = 80;

type SwipeableRowProps = {
  children: React.ReactNode;
  onSwipeRight?: () => void; // Usually "Like"
  onSwipeLeft?: () => void;  // Usually "Add to Queue"
};

export function SwipeableRow({ children, onSwipeRight, onSwipeLeft }: SwipeableRowProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD && onSwipeRight) {
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD && onSwipeLeft) {
        runOnJS(onSwipeLeft)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [20, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [20, SWIPE_THRESHOLD],
      [0.5, 1.2],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -20],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -20],
      [1.2, 0.5],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.background}>
          <Animated.View style={[styles.action, styles.leftAction, leftActionStyle]}>
            <Heart size={24} color="#fff" fill="#fff" />
          </Animated.View>
          <Animated.View style={[styles.action, styles.rightAction, rightActionStyle]}>
            <Plus size={24} color="#fff" />
          </Animated.View>
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    backgroundColor: colors.background,
  },
  background: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  action: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftAction: {
    backgroundColor: '#ff4b2b',
  },
  rightAction: {
    backgroundColor: colors.brand,
  },
});
