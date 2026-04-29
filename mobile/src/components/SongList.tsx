import React, {memo, useCallback} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {Music} from 'lucide-react-native';

import {TrackRow} from './TrackRow';
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
  const artistLabel = item.album ? `${item.artist} · ${item.album}` : item.artist;

  return (
    <TrackRow
      title={item.title}
      artist={artistLabel}
      thumbnail={item.artwork}
      isActive={isActive}
      onPress={() => onPressSong(item.id)}
      rightSlot={
        isActive ? (
          <View style={styles.playingBadge}>
            <Text style={styles.playingText}>PLAYING</Text>
          </View>
        ) : duration ? (
          <Text style={styles.durationText}>{duration}</Text>
        ) : undefined
      }
    />
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
  durationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
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
