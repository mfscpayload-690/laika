import React, {memo, useCallback} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {AudioLines, Music} from 'lucide-react-native';

import {colors, radii, spacing, typography} from '../theme';
import type {LocalSong} from '../types/music';

export const SONG_ROW_HEIGHT = 64;

export const SONG_LIST_VIRTUALIZATION_CONFIG = {
  initialNumToRender: 12,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  windowSize: 7,
  removeClippedSubviews: true,
} as const;

type SongListProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  emptyMessage?: string;
  onScanPress?: () => void;
};

function formatDuration(ms: number): string {
  if (!ms) {
    return '';
  }
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

type SongRowProps = {
  item: LocalSong;
  isActive: boolean;
  onPressSong: (songId: string) => void;
};

const SongRow = memo(function SongRow({item, isActive, onPressSong}: SongRowProps) {
  const duration = formatDuration(item.duration);

  return (
    <Pressable
      style={[styles.row, isActive && styles.activeRow]}
      onPress={() => onPressSong(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} by ${item.artist}${isActive ? ', currently playing' : ''}`}>
      <View style={styles.iconSquare}>
        {isActive ? (
          <AudioLines size={20} color={colors.brand} strokeWidth={2} />
        ) : (
          <Music size={20} color={colors.textMuted} strokeWidth={2} />
        )}
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
          {duration ? `  ·  ${duration}` : ''}
        </Text>
      </View>

      {isActive ? (
        <View style={styles.playingBadge}>
          <Text style={styles.playingText}>PLAYING</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const SongListEmpty = memo(function SongListEmpty({
  emptyMessage,
  onScanPress,
}: {
  emptyMessage: string;
  onScanPress?: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Music size={56} color={colors.surfaceElevated} />
      <Text style={styles.emptyTitle}>No local songs yet</Text>
      <Text style={styles.emptySubtitle}>Scan your device to find audio files</Text>
      {onScanPress ? (
        <Pressable
          style={styles.scanButton}
          onPress={onScanPress}
          accessibilityRole="button"
          accessibilityLabel="Scan device for audio files">
          <Text style={styles.scanButtonLabel}>Scan Device</Text>
        </Pressable>
      ) : (
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      )}
    </View>
  );
});

export function SongList({
  songs,
  currentTrackId,
  onPressSong,
  emptyMessage = 'No local songs found yet.',
  onScanPress,
}: SongListProps) {
  const getItemLayout = useCallback(
    (_: ArrayLike<LocalSong> | null | undefined, index: number) => ({
      length: SONG_ROW_HEIGHT + spacing.xs,
      offset: (SONG_ROW_HEIGHT + spacing.xs) * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: LocalSong) => item.id, []);

  const renderItem = useCallback<ListRenderItem<LocalSong>>(
    ({item}) => (
      <SongRow item={item} isActive={item.id === currentTrackId} onPressSong={onPressSong} />
    ),
    [currentTrackId, onPressSong],
  );

  return (
    <FlatList
      data={songs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      contentContainerStyle={songs.length === 0 ? styles.emptyListContent : styles.content}
      keyboardShouldPersistTaps="handled"
      {...SONG_LIST_VIRTUALIZATION_CONFIG}
      ListEmptyComponent={<SongListEmpty emptyMessage={emptyMessage} onScanPress={onScanPress} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  row: {
    height: SONG_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
  activeRow: {
    backgroundColor: colors.surfaceElevated,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
    marginTop: 2,
    color: colors.textSecondary,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  scanButton: {
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  scanButtonLabel: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});
