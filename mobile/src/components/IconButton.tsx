import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../theme';

type IconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  accessibilityLabel: string;
};

export function IconButton({
  icon,
  onPress,
  disabled,
  variant = 'default',
  size = 'md',
  style,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
  },
  // Sizes
  sm: { width: 36, height: 36, borderRadius: radii.sm },
  md: { width: 44, height: 44, borderRadius: radii.md },
  lg: { width: 56, height: 56, borderRadius: radii.lg },
  // Variants
  default: {
    borderColor: colors.borderAccent,
    backgroundColor: colors.surface,
  },
  primary: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeDeep,
  },
  ghost: {
    borderColor: colors.brandGlow,
    backgroundColor: colors.deepBlue,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
