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

type SortMode = 'alphabetical' | 'duration' | 'recentlyAdded' | 'recentlyModified';
type LengthFilter = 'all' | 'short' | 'medium' | 'long';

const SORT_OPTIONS: Array<{value: SortMode; label: string}> = [
  {value: 'alphabetical', label: 'A-Z'},
  {value: 'duration', label: 'Duration'},
  {value: 'recentlyAdded', label: 'Added'},
  {value: 'recentlyModified', label: 'Modified'},
];

const LENGTH_FILTERS: Array<{value: LengthFilter; label: string}> = [
  {value: 'all', label: 'All'},
  {value: 'short', label: '< 3m'},
  {value: 'medium', label: '3-6m'},
  {value: 'long', label: '6m+'},
];

type LibraryScreenProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  onOpenPlayer: () => void;
  onScan: () => void;
};

function getEffectiveTimestamp(song: LocalSong): number {
  return song.addedAt ?? song.modifiedAt ?? 0;
}

function matchesLengthFilter(song: LocalSong, filter: LengthFilter): boolean {
  const durationMs = song.duration;

  if (filter === 'all') {
    return true;
  }

  if (filter === 'short') {
    return durationMs > 0 && durationMs < 3 * 60 * 1000;
  }

  if (filter === 'medium') {
    return durationMs >= 3 * 60 * 1000 && durationMs < 6 * 60 * 1000;
  }

  return durationMs >= 6 * 60 * 1000;
}

function sortSongs(songs: LocalSong[], sortMode: SortMode): LocalSong[] {
  const copy = [...songs];

  if (sortMode === 'duration') {
    return copy.sort(
      (a, b) => (b.duration || 0) - (a.duration || 0) || a.title.localeCompare(b.title),
    );
  }

  if (sortMode === 'recentlyAdded') {
    return copy.sort(
      (a, b) => getEffectiveTimestamp(b) - getEffectiveTimestamp(a) || a.title.localeCompare(b.title),
    );
  }

  if (sortMode === 'recentlyModified') {
    return copy.sort(
      (a, b) => (b.modifiedAt ?? b.addedAt ?? 0) - (a.modifiedAt ?? a.addedAt ?? 0) ||
        a.title.localeCompare(b.title),
    );
  }

  return copy.sort((a, b) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist));
}

export function LibraryScreen({
  songs,
  currentTrackId,
  onPressSong,
  onOpenPlayer,
  onScan,
}: LibraryScreenProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical');
  const [lengthFilter, setLengthFilter] = useState<LengthFilter>('all');

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
    const filteredSongs = indexedSongs
      .filter(entry => matchesLengthFilter(entry.song, lengthFilter))
      .filter(entry => entry.searchText.includes(normalizedQuery))
      .map(entry => entry.song);

    return sortSongs(filteredSongs, sortMode);
  }, [debouncedQuery, indexedSongs, lengthFilter, sortMode]);

  const activeFilterCount =
    (sortMode === 'alphabetical' ? 0 : 1) + (lengthFilter === 'all' ? 0 : 1) +
    (debouncedQuery.trim() ? 1 : 0);

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

      <View style={styles.metaRow}>
        <Text style={styles.subtitle}>{visibleSongs.length} shown • {songs.length} total</Text>
        {activeFilterCount > 0 ? (
          <Text style={styles.filterSummary}>{activeFilterCount} filters active</Text>
        ) : null}
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

      <View style={styles.chipGroup}>
        <Text style={styles.controlLabel}>Sort</Text>
        <View style={styles.chipsRow}>
          {SORT_OPTIONS.map(option => (
            <Pressable
              key={option.value}
              onPress={() => setSortMode(option.value)}
              accessibilityRole="button"
              accessibilityState={{selected: sortMode === option.value}}
              style={[styles.chip, sortMode === option.value && styles.chipActive]}>
              <Text style={[styles.chipLabel, sortMode === option.value && styles.chipLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.chipGroup}>
        <Text style={styles.controlLabel}>Length</Text>
        <View style={styles.chipsRow}>
          {LENGTH_FILTERS.map(option => (
            <Pressable
              key={option.value}
              onPress={() => setLengthFilter(option.value)}
              accessibilityRole="button"
              accessibilityState={{selected: lengthFilter === option.value}}
              style={[styles.chip, lengthFilter === option.value && styles.chipActive]}>
              <Text style={[styles.chipLabel, lengthFilter === option.value && styles.chipLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
  metaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterSummary: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
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
  chipGroup: {
    marginTop: spacing.sm,
  },
  controlLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: colors.background,
  },
  listWrap: {
    flex: 1,
    marginTop: spacing.md,
  },
});
