import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, ChevronUp, Search as SearchIcon, ChevronLeft } from 'lucide-react-native';
import { useUI } from '../context/UIContext';
import { SongList } from '../components/SongList';
import { colors, radii, spacing, typography } from '../theme';
import type { LocalSong } from '../types/music';
import { useMusicState } from '../context/MusicStateContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getEffectiveTimestamp(song: LocalSong): number {
  return song.addedAt ?? song.modifiedAt ?? 0;
}

function sortSongs(songs: LocalSong[], ascending: boolean): LocalSong[] {
  const copy = [...songs];
  return copy.sort((a, b) => {
    const aTime = getEffectiveTimestamp(a);
    const bTime = getEffectiveTimestamp(b);
    if (ascending) {
      return aTime - bTime || a.title.localeCompare(b.title);
    }
    return bTime - aTime || a.title.localeCompare(b.title);
  });
}

export default function LocalSongsScreen() {
  const musicState = useMusicState();
  const { 
    songs, 
    currentTrackId, 
    onPressSong, 
    onScan 
  } = musicState;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showAddToPlaylist } = useUI();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dateAddedAscending, setDateAddedAscending] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        setDebouncedQuery(query);
      });
    }, 180);
    return () => clearTimeout(timeout);
  }, [query]);

  const sortedSongs = useMemo(() => sortSongs(songs, dateAddedAscending), [songs, dateAddedAscending]);

  const visibleSongs = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery) return sortedSongs;
    
    return sortedSongs.filter(song => {
      const searchText = `${song.title} ${song.artist} ${song.album ?? ''}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [sortedSongs, debouncedQuery]);

  const handleLongPress = useCallback((song: LocalSong) => {
    showAddToPlaylist(song);
  }, [showAddToPlaylist]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Local Files</Text>
      </View>

      <View style={styles.searchBar}>
        <SearchIcon size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search local songs"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterTitle}>Date Added</Text>
          <Pressable onPress={() => setDateAddedAscending(!dateAddedAscending)} style={styles.sortBtn}>
            {dateAddedAscending ? <ChevronUp size={20} color={colors.brand} /> : <ChevronDown size={20} color={colors.brand} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.listContainer}>
        <SongList
          songs={visibleSongs}
          currentTrackId={currentTrackId ?? undefined}
          onPressSong={onPressSong}
          onScanPress={onScan}
          onLongPressSong={handleLongPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  searchBar: {
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: {
    ...typography.label,
    color: colors.textMuted,
  },
  sortBtn: {
    padding: spacing.xs,
  },
  listContainer: {
    flex: 1,
  },
});
