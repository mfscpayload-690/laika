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
import { ChevronDown, ChevronUp } from 'lucide-react-native';

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

function matchesArtistFilter(song: LocalSong, artist: string | null): boolean {
  if (artist === null) {
    return true;
  }
  return song.artist === artist;
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

function getUniqueArtists(songs: LocalSong[]): string[] {
  const artists = new Set<string>();
  songs.forEach(song => {
    if (song.artist && song.artist.trim()) {
      artists.add(song.artist);
    }
  });
  return Array.from(artists).sort((a, b) => a.localeCompare(b));
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
  const [artistFilter, setArtistFilter] = useState<string | null>(null);
  const [activeLetterState, setActiveLetterState] = useState<string | null>(null);
  const popAnim = React.useRef(new Animated.Value(0)).current;
  const sidebarOpacity = React.useRef(new Animated.Value(0)).current;
  const popY = React.useRef(new Animated.Value(0)).current;

  const sidebarRef = React.useRef<View>(null);
  const sidebarLayout = React.useRef({ y: 0, height: 0 });
  const lastUpdate = React.useRef(0);
  const hideTimer = React.useRef<any>(null);

  const showSidebar = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(sidebarOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    hideTimer.current = setTimeout(() => {
      Animated.timing(sidebarOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };

  const handleLetterSelection = (y: number, isFinal = false) => {
    if (sidebarLayout.current.height === 0) return;
    
    const relativeY = y - sidebarLayout.current.y;
    const totalLetters = ALPHABET.length + 1;
    const letterHeight = sidebarLayout.current.height / totalLetters;
    
    let index = Math.floor(relativeY / letterHeight);
    index = Math.max(0, Math.min(index, totalLetters - 1));
    
    const selected = index === 0 ? 'all' : ALPHABET[index - 1];
    const letterText = selected === 'all' ? '•' : selected;

    popY.setValue(y - sidebarLayout.current.y - 27);

    if (letterText !== activeLetterState) {
      setActiveLetterState(letterText);
    }

    const now = Date.now();
    // Zero-delay for internal state (real-time!)
    if (selected !== alphabetFilter) {
      setAlphabetFilter(selected);
    }
    lastUpdate.current = now;
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        showSidebar();
        handleLetterSelection(evt.nativeEvent.pageY);
        Animated.spring(popAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 10,
        }).start();
      },
      onPanResponderMove: (evt) => {
        handleLetterSelection(evt.nativeEvent.pageY);
      },
      onPanResponderRelease: (evt) => {
        handleLetterSelection(evt.nativeEvent.pageY, true);
        setActiveLetterState(null);
        Animated.timing(popAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        setActiveLetterState(null);
      },
    })
  ).current;

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

  const availableArtists = useMemo(() => getUniqueArtists(songs), [songs]);

  const visibleSongs = useMemo(() => {
    const pool = songsByAlphabet[alphabetFilter] || [];
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    
    if (!normalizedQuery && !artistFilter) {
      return pool;
    }

    return pool.filter(song => {
      const matchesArtist = matchesArtistFilter(song, artistFilter);
      if (!matchesArtist) return false;
      
      if (!normalizedQuery) return true;
      const searchText = `${song.title} ${song.artist} ${song.album ?? ''}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [alphabetFilter, songsByAlphabet, debouncedQuery, artistFilter]);

  const activeFilterCount =
    (alphabetFilter === 'all' ? 0 : 1) +
    (artistFilter === null ? 0 : 1) +
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

      {/* Artist Filter */}
      {availableArtists.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Artist</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.artistScroll}
            contentContainerStyle={styles.artistContent}>
            <Pressable
              onPress={() => setArtistFilter(null)}
              style={[
                styles.artistChip,
                artistFilter === null && styles.artistChipActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{selected: artistFilter === null}}>
              <Text
                style={[
                  styles.artistLabel,
                  artistFilter === null && styles.artistLabelActive,
                ]}>
                All Artists
              </Text>
            </Pressable>
            {availableArtists.map((artist: string) => (
              <Pressable
                key={artist}
                onPress={() => setArtistFilter(artist)}
                style={[
                  styles.artistChip,
                  artistFilter === artist && styles.artistChipActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{selected: artistFilter === artist}}>
                <Text
                  style={[
                    styles.artistLabel,
                    artistFilter === artist && styles.artistLabelActive,
                  ]}>
                  {artist}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

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

        {/* Alphabet Sidebar on Right */}
        <Animated.View 
          ref={sidebarRef}
          onLayout={() => {
            sidebarRef.current?.measure((x, y, width, height, pageX, pageY) => {
              sidebarLayout.current = { y: pageY, height };
            });
          }}
          style={[
            styles.alphabetSidebarContainer,
            { 
              opacity: sidebarOpacity,
              transform: [{ translateX: sidebarOpacity.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
            }
          ]}
          {...panResponder.panHandlers}>
          <View style={styles.alphabetSidebar}>
            <View style={styles.alphabetSidebarContent}>
              <View style={styles.sidebarChip}>
                <Animated.Text
                  style={[
                    styles.sidebarLabel,
                    alphabetFilter === 'all' && styles.sidebarLabelActive,
                    {
                      transform: [{
                        scale: alphabetFilter === 'all' ? 1.5 : 1
                      }]
                    }
                  ]}>
                  •
                </Animated.Text>
              </View>
              {ALPHABET.map((letter, idx) => {
                const isActive = alphabetFilter === letter;
                return (
                  <View
                    key={letter}
                    style={styles.sidebarChip}>
                    <Animated.Text
                      style={[
                        styles.sidebarLabel,
                        isActive && styles.sidebarLabelActive,
                        {
                          transform: [{
                            scale: isActive ? 1.6 : 1
                          }, {
                            translateX: isActive ? -4 : 0
                          }]
                        }
                      ]}>
                      {letter}
                    </Animated.Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Pop Indicator */}
        {activeLetterState && (
          <Animated.View 
            pointerEvents="none"
            style={[
              styles.popIndicator,
              {
                opacity: popAnim,
                transform: [
                  { translateY: popY },
                  { scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { translateX: popAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }
                ]
              }
            ]}>
            <View style={styles.popBubble}>
              <Text style={styles.popText}>{activeLetterState}</Text>
            </View>
          </Animated.View>
        )}
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
  alphabetSidebarContainer: {
    width: 30, // Wider touch area for better UX
    justifyContent: 'center',
    marginRight: -spacing.xs,
    zIndex: 10,
  },
  alphabetSidebar: {
    flex: 1,
    justifyContent: 'center',
  },
  alphabetSidebarContent: {
    alignItems: 'center',
    gap: 1,
  },
  sidebarChip: {
    width: 20,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  sidebarLabelActive: {
    color: colors.brand,
    fontWeight: '900',
  },
  popIndicator: {
    position: 'absolute',
    right: 40,
    top: 0,
    zIndex: 100,
  },
  popBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  popText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.background,
  },
  artistScroll: {
    marginHorizontal: -spacing.base,
  },
  artistContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  artistChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  artistChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  artistLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  artistLabelActive: {
    color: colors.background,
  },
});
