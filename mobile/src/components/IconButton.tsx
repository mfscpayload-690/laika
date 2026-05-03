import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../theme';
import { BouncyPressable, HapticType } from './BouncyPressable';

type IconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  accessibilityLabel: string;
  hapticType?: HapticType;
};

export function IconButton({
  icon,
  onPress,
  disabled,
  variant = 'default',
  size = 'md',
  style,
  accessibilityLabel,
  hapticType = 'selection',
}: IconButtonProps) {
  return (
    <BouncyPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hapticType={hapticType}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        disabled && styles.disabled,
        style,
      ]}>
      {icon}
    </BouncyPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  // Sizes
  sm: { width: 36, height: 36, borderRadius: radii.sm },
  md: { width: 44, height: 44, borderRadius: radii.md },
  lg: { width: 56, height: 56, borderRadius: radii.lg },
  // Variants
  default: {
    backgroundColor: colors.surfaceElevated,
  },
  primary: {
    backgroundColor: colors.brand,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
