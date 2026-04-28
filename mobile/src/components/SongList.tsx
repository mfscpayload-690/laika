import React from 'react';
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AudioLines, Music } from 'lucide-react-native';

import { SectionHeader } from './SectionHeader';
import { colors, radii, spacing, typography } from '../theme';
import type { LocalSong } from '../types/music';

type SongListProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  emptyMessage?: string;
  onScanPress?: () => void;
};

const ICON_COLORS = [
  '#7c3aed', '#0369a1', '#065f46', '#92400e',
  '#9f1239', '#1d4ed8', '#0f766e', '#4d7c0f',
  '#6b21a8', '#b45309',
];

function formatDuration(ms: number): string {
  if (!ms) return '';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

type SongRowProps = {
  item: LocalSong;
  isActive: boolean;
  onPress: () => void;
};

function SongRow({ item, isActive, onPress }: SongRowProps) {
  const iconBg = ICON_COLORS[item.title.charCodeAt(0) % ICON_COLORS.length];
  const duration = formatDuration(item.duration);

  return (
    <Pressable
      style={[styles.row, isActive && styles.activeRow]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} by ${item.artist}${isActive ? ', currently playing' : ''}`}>
      <View style={[styles.iconSquare, { backgroundColor: iconBg }]}>
        {isActive ? (
          <AudioLines size={20} color="#ffffff" strokeWidth={2} />
        ) : (
          <Music size={20} color="#ffffff" strokeWidth={2} />
        )}
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
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
}

type SongSection = {
  title: string;
  data: LocalSong[];
};

function buildSections(songs: LocalSong[]): SongSection[] {
  const map = new Map<string, LocalSong[]>();

  for (const song of songs) {
    const first = song.title.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(first) ? first : '#';
    const bucket = map.get(key) ?? [];
    bucket.push(song);
    map.set(key, bucket);
  }

  const alpha = Array.from(map.entries())
    .filter(([k]) => k !== '#')
    .sort(([a], [b]) => a.localeCompare(b));

  const hash = map.get('#');
  const all = hash ? [...alpha, ['#', hash] as [string, LocalSong[]]] : alpha;

  return all.map(([letter, data]) => ({
    title: letter,
    data: [...data].sort((a, b) => a.title.localeCompare(b.title)),
  }));
}

export function SongList({
  songs,
  currentTrackId,
  onPressSong,
  emptyMessage = 'No local songs found yet.',
  onScanPress,
}: SongListProps) {
  if (songs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Music size={56} color={colors.borderAccent} />
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
        ) : emptyMessage ? (
          <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        ) : null}
      </View>
    );
  }

  if (songs.length > 20) {
    const sections = buildSections(songs);
    return (
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <SectionHeader label={section.title} />
        )}
        renderItem={({ item }) => (
          <SongRow
            item={item}
            isActive={item.id === currentTrackId}
            onPress={() => onPressSong(item.id)}
          />
        )}
      />
    );
  }

  return (
    <FlatList
      data={songs}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <SongRow
          item={item}
          isActive={item.id === currentTrackId}
          onPress={() => onPressSong(item.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
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
  activeRow: {
    borderColor: colors.active,
    backgroundColor: colors.activeBg,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  artist: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textSecondary,
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
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.deepBlue,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  scanButtonLabel: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
});
