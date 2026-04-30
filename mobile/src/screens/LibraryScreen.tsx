import React, {useEffect, useMemo, useState} from 'react';
import {
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { SongList } from '../components/SongList';
import { AlphabetSidebar } from '../components/AlphabetSidebar';
import { colors, radii, spacing, typography } from '../theme';
import type { LocalSong } from '../types/music';

type LibraryScreenProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  onOpenPlayer: () => void;
  onScan: () => void;
};

const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

function getEffectiveTimestamp(song: LocalSong): number {
  return song.addedAt ?? song.modifiedAt ?? 0;
}

function matchesAlphabetFilter(song: LocalSong, letter: string): boolean {
  if (letter === 'all') {
    return true;
  }
  return song.title.charAt(0).toUpperCase() === letter;
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

export function LibraryScreen({
  songs,
  currentTrackId,
  onPressSong,
  onOpenPlayer,
  onScan,
}: LibraryScreenProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [alphabetFilter, setAlphabetFilter] = useState<'all' | string>('all');
  const [dateAddedAscending, setDateAddedAscending] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      // Reset filter to 'all' when the user taps the Library tab again
      setAlphabetFilter('all');
    });
    return unsubscribe;
  }, [navigation]);
  const sidebarOpacity = React.useRef(new Animated.Value(0.3)).current;
  const hideTimer = React.useRef<any>(null);
  const lastUpdate = React.useRef(0);

  const showSidebar = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(sidebarOpacity, {
      toValue: 1.0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    hideTimer.current = setTimeout(() => {
      Animated.timing(sidebarOpacity, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };

  const handleLetterChange = React.useCallback((letter: string, isFinal: boolean) => {
    const now = Date.now();
    // Throttle the heavy list re-render, but guarantee final state
    if (isFinal || now - lastUpdate.current > 150) {
      if (alphabetFilter !== letter) {
        setAlphabetFilter(letter);
      }
      lastUpdate.current = now;
    }
  }, [alphabetFilter]);

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

  const sortedSongs = useMemo(() => sortSongs(songs, dateAddedAscending), [songs, dateAddedAscending]);

  const songsByAlphabet = useMemo(() => {
    const map: Record<string, LocalSong[]> = { all: sortedSongs };
    ALPHABET.forEach(letter => {
      map[letter] = sortedSongs.filter(s => matchesAlphabetFilter(s, letter));
    });
    return map;
  }, [sortedSongs]);

  const visibleSongs = useMemo(() => {
    const pool = songsByAlphabet[alphabetFilter] || [];
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    
    if (!normalizedQuery) {
      return pool;
    }

    return pool.filter(song => {
      const searchText = `${song.title} ${song.artist} ${song.album ?? ''}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [alphabetFilter, songsByAlphabet, debouncedQuery]);

  const activeFilterCount =
    (alphabetFilter === 'all' ? 0 : 1) +
    (debouncedQuery.trim() ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Your Library</Text>
          <Text style={styles.subtitle}>{songs.length} songs</Text>
        </View>
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

      {/* Date Added Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterTitle}>Date Added</Text>
          <Pressable
            onPress={() => setDateAddedAscending(!dateAddedAscending)}
            style={styles.dateToggle}
            accessibilityRole="button"
            accessibilityLabel={`Sort by date ${dateAddedAscending ? 'ascending' : 'descending'}`}>
            {dateAddedAscending ? (
              <ChevronUp size={20} color={colors.brand} />
            ) : (
              <ChevronDown size={20} color={colors.brand} />
            )}
          </Pressable>
        </View>
        <Text style={styles.dateInfo}>
          {dateAddedAscending ? 'Oldest first' : 'Newest first'}
        </Text>
      </View>

      <View style={styles.listContainer}>
        <View style={styles.listWrap}>
          <SongList
            songs={visibleSongs}
            currentTrackId={currentTrackId}
            onPressSong={onPressSong}
            onScanPress={onScan}
            onScroll={() => showSidebar()}
            onScrollBeginDrag={() => showSidebar()}
          />
        </View>

        <AlphabetSidebar 
          currentFilter={alphabetFilter} 
          onLetterChange={handleLetterChange}
          opacityAnim={sidebarOpacity}
          onInteractStart={showSidebar}
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
    paddingBottom: 40,
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
  filterSection: {
    marginTop: spacing.md,
  },
  filterTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dateToggle: {
    padding: spacing.xs,
  },
  dateInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  alphabetScroll: {
    marginHorizontal: -spacing.base,
  },
  alphabetContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  alphabetChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  alphabetLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  alphabetLabelActive: {
    color: colors.background,
  },
  listContainer: {
    flex: 1,
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listWrap: {
    flex: 1,
  },
});
