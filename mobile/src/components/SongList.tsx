import React, {memo, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
const AnyFlashList = FlashList as any;
import {Music} from 'lucide-react-native';

import {TrackRow} from './TrackRow';
import {BouncyPressable} from './BouncyPressable';
import {colors, radii, spacing, typography} from '../theme';
import type {LocalSong} from '../types/music';

import Animated from 'react-native-reanimated';

export const SONG_ROW_HEIGHT = 64;

export const SONG_LIST_VIRTUALIZATION_CONFIG = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 5,
  updateCellsBatchingPeriod: 100,
  windowSize: 5,
  removeClippedSubviews: true,
} as const;

type SongListProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  onLongPressSong?: (song: LocalSong) => void;
  emptyMessage?: string;
  onScanPress?: () => void;
  onScroll?: (event: any) => void;
  onScrollBeginDrag?: () => void;
  onScrollEndDrag?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  contentContainerStyle?: any;
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
  onLongPress?: (song: LocalSong) => void;
};

const SongRow = memo(function SongRow({item, isActive, onPressSong, onLongPress}: SongRowProps) {
  const duration = formatDuration(item.duration);
  const artistLabel = item.album ? `${item.artist} · ${item.album}` : item.artist;

  const handlePress = useCallback(() => {
    onPressSong(item.id);
  }, [item.id, onPressSong]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(item);
  }, [item, onLongPress]);

  return (
    <TrackRow
      title={item.title}
      artist={artistLabel}
      thumbnail={item.artwork}
      isActive={isActive}
      onPress={handlePress}
      onLongPress={handleLongPress}
      showMenuIcon={true}
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
        <BouncyPressable
          style={styles.scanButton}
          onPress={onScanPress}
          hapticType="selection"
          accessibilityRole="button"
          accessibilityLabel="Scan device for audio files">
          <Text style={styles.scanButtonLabel}>Scan Device</Text>
        </BouncyPressable>
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
  onLongPressSong,
  onScroll,
  onScrollBeginDrag,
  onScrollEndDrag,
  ListHeaderComponent,
  contentContainerStyle,
}: SongListProps) {
  const keyExtractor = useCallback((item: LocalSong) => item.id, []);

  const renderItem = useCallback(
    ({item}: {item: LocalSong}) => (
      <SongRow
        item={item}
        isActive={item.id === currentTrackId}
        onPressSong={onPressSong}
        onLongPress={onLongPressSong}
      />
    ),
    [currentTrackId, onPressSong, onLongPressSong],
  );

  return (
    <AnyFlashList
      data={songs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      estimatedItemSize={SONG_ROW_HEIGHT + spacing.xs}
      contentContainerStyle={StyleSheet.flatten([
        songs.length === 0 ? styles.emptyListContent : styles.content,
        contentContainerStyle
      ])}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      onScrollBeginDrag={onScrollBeginDrag}
      onScrollEndDrag={onScrollEndDrag}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<SongListEmpty emptyMessage={emptyMessage} onScanPress={onScanPress} />}
      ListHeaderComponent={ListHeaderComponent}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 180,
  },
  emptyListContent: {
    // FlashList doesn't support flexGrow in contentContainerStyle
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
