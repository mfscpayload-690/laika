import React, { memo } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Music, MoreVertical } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';
import { BouncyPressable } from './BouncyPressable';

type TrackRowProps = {
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  isActive?: boolean;
  isLoading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  onLongPress?: () => void;
  showMenuIcon?: boolean;
  /** Optional right-side slot override */
  rightSlot?: React.ReactNode;
};

export const TrackRow = memo(({
  title,
  artist,
  album,
  thumbnail,
  isActive,
  isLoading,
  onPress,
  disabled,
  onLongPress,
  showMenuIcon,
  rightSlot,
}: TrackRowProps) => {
  return (
    <BouncyPressable
      style={[styles.row, isActive && styles.rowActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hapticType="impactLight"
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${artist}${album ? ` on ${album}` : ''}`}>
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Music size={18} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.textWrap}>
        <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {artist}{album ? ` • ${album}` : ''}
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
      ) : showMenuIcon ? (
        <MoreVertical size={20} color={colors.textMuted} />
      ) : null}
    </BouncyPressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
  rowActive: {
    backgroundColor: colors.surfaceElevated,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radii.xs,
    marginRight: spacing.md,
  },
  thumbFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  titleActive: {
    color: colors.brand,
  },
  artist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
  },
  playingText: {
    color: colors.brand,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
