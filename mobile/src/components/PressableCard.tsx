import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../theme';

type PressableCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  active?: boolean;
  accessibilityLabel?: string;
};

export function PressableCard({
  children,
  onPress,
  disabled,
  style,
  active,
  accessibilityLabel,
}: PressableCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        active && styles.cardActive,
        pressed && styles.cardPressed,
        disabled && styles.cardDisabled,
        style,
      ]}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: colors.surface,
    padding: 12,
  },
  cardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceElevated,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  cardDisabled: {
    opacity: 0.45,
  },
});
