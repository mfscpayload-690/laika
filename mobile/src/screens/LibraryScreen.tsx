import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SongList } from '../components/SongList';
import { colors, radii, spacing, typography } from '../theme';
import type { LocalSong } from '../types/music';

type LibraryScreenProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  onOpenPlayer: () => void;
  onScan: () => void;
};

export function LibraryScreen({
  songs,
  currentTrackId,
  onPressSong,
  onOpenPlayer,
  onScan,
}: LibraryScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Device Library</Text>
          <Text style={styles.subtitle}>Device Library · {songs.length} songs</Text>
        </View>

        <Pressable
          style={[styles.playerButton, songs.length === 0 && styles.playerButtonDisabled]}
          onPress={onOpenPlayer}
          disabled={songs.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Open player">
          <Text style={styles.playerButtonLabel}>Player</Text>
        </Pressable>
      </View>

      <View style={styles.listWrap}>
        <SongList
          songs={songs}
          currentTrackId={currentTrackId}
          onPressSong={onPressSong}
          onScanPress={onScan}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  playerButton: {
    borderRadius: radii.md - 2,
    borderWidth: 1,
    borderColor: colors.brandGlow,
    backgroundColor: colors.deepBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playerButtonDisabled: {
    opacity: 0.45,
  },
  playerButtonLabel: {
    color: colors.skyLight,
    fontWeight: '700',
    fontSize: 12,
  },
  listWrap: {
    flex: 1,
    marginTop: spacing.md,
  },
});
