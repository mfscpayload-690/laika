import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Haptics } from '../utils/haptics';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 15, stiffness: 200, mass: 0.6 };

export type HapticType = 'selection' | 'impactLight' | 'impactMedium' | 'impactHeavy' | 'notificationSuccess' | 'notificationError';

interface BouncyPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticType?: HapticType;
  children?: React.ReactNode;
}

export const BouncyPressable = React.memo(({
  style,
  scaleTo = 0.96,
  hapticType,
  children,
  ...props
}: BouncyPressableProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING_CONFIG);
        if (hapticType) {
          Haptics[hapticType]();
        }
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING_CONFIG);
        props.onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
});
