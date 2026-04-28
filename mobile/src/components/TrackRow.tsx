import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Music } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';

type TrackRowProps = {
  title: string;
  artist: string;
  thumbnail?: string;
  isActive?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Optional right-side slot override */
  rightSlot?: React.ReactNode;
};

export function TrackRow({
  title,
  artist,
  thumbnail,
  isActive,
  isLoading,
  onPress,
  disabled,
  rightSlot,
}: TrackRowProps) {
  return (
    <Pressable
      style={[styles.row, isActive && styles.rowActive]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${artist}`}>
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Music size={18} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
        </Text>
      </View>

      {rightSlot !== undefined ? (
        rightSlot
      ) : isLoading ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : isActive ? (
        <View style={styles.playingBadge}>
          <Text style={styles.playingText}>PLAYING</Text>
        </View>
      ) : (
        <View style={styles.dot} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderAccent,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  rowActive: {
    borderColor: colors.active,
    backgroundColor: colors.activeBg,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    marginRight: spacing.md,
  },
  thumbFallback: {
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  artist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.borderAccent,
  },
  playingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm - 2,
    backgroundColor: colors.activeDeepBg,
    borderWidth: 1,
    borderColor: colors.activeBorder,
  },
  playingText: {
    color: colors.active,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
