import React, {useEffect, useMemo, useState} from 'react';
import {
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        setDebouncedQuery(query);
      });
    }, 180);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const perfStart = Date.now();
    const id = setTimeout(() => {
      const elapsed = Date.now() - perfStart;
      console.log(`[perf] library:first-paint ${elapsed}ms`);
    }, 0);

    return () => clearTimeout(id);
  }, []);

  const indexedSongs = useMemo(
    () =>
      songs.map(song => ({
        song,
        searchText: `${song.title} ${song.artist} ${song.album ?? ''}`.toLowerCase(),
      })),
    [songs],
  );

  const visibleSongs = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return songs;
    }

    return indexedSongs
      .filter(entry => entry.searchText.includes(normalizedQuery))
      .map(entry => entry.song);
  }, [debouncedQuery, indexedSongs, songs]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Your Library</Text>
          <Text style={styles.subtitle}>{songs.length} songs</Text>
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

      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Filter local songs"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.listWrap}>
        <SongList
          songs={visibleSongs}
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
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textSecondary,
  },
  playerButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playerButtonDisabled: {
    opacity: 0.45,
  },
  playerButtonLabel: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 12,
  },
  listWrap: {
    flex: 1,
    marginTop: spacing.md,
  },
  searchBar: {
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
});
