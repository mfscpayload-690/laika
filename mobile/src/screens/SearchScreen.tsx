import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
const AnyFlashList = FlashList as any;
import { Music, Search, SearchX, X } from 'lucide-react-native';
import { useMusicStore } from '../store/musicStore';
import { useUIStore } from '../store/uiStore';

import { IconButton } from '../components/IconButton';
import { TrackRow } from '../components/TrackRow';
import { searchTracks, prefetchTrack } from '../services/api';
import { BouncyPressable } from '../components/BouncyPressable';
import { colors, radii, spacing, typography } from '../theme';
import type { RemoteTrack } from '../types/music';

type SearchScreenProps = {
  onSelectTrack: (track: RemoteTrack) => void;
  resolvingId: string | null;
  activeTrackId: string | null;
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


export default function SearchScreen() {
  const onSelectTrack = useMusicStore(state => state.playRemote);
  const resolvingId = useMusicStore(state => (state.isResolving ? state.activeRemoteTrack?.id : null));
  const activeTrackId = useMusicStore(state => state.activeRemoteTrack?.id);
  const showAddToPlaylist = useUIStore(state => state.showAddToPlaylist);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RemoteTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryStartRef = useRef<number | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tracks = await searchTracks(q.trim());
      InteractionManager.runAfterInteractions(() => {
        setResults(tracks);
        
        // Phase 1: Pre-resolve TOP 3 results for <300ms playback
        if (tracks.length > 0) {
          const top3 = tracks.slice(0, 3);
          top3.forEach(t => prefetchTrack(t));
        }

        if (__DEV__ && queryStartRef.current) {
          const elapsed = Date.now() - queryStartRef.current;
          console.log(`[perf] search:input->result ${elapsed}ms`);
          queryStartRef.current = null;
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (__DEV__) {
      queryStartRef.current = Date.now();
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => runSearch(value), 180);
  };

  const handleSubmit = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    runSearch(query).catch(() => undefined);
  };

  const handleClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setQuery('');
    setResults([]);
    setError(null);
  };

  const showTypePrompt = !loading && !error && query.trim() === '';
  const showNoResults =
    !loading && !error && query.trim() !== '' && results.length === 0;
  const indexedResults = useMemo(
    () =>
      results.map(track => ({
        track,
        searchText: `${track.title} ${track.artist}`.toLowerCase(),
      })),
    [results],
  );
  const visibleResults = useMemo(() => indexedResults.map(entry => entry.track), [indexedResults]);

  const renderTrack = useCallback(({ item }: { item: RemoteTrack }) => (
    <TrackRow
      title={item.title}
      artist={item.artist}
      album={item.album}
      thumbnail={item.thumbnail}
      isActive={item.id === activeTrackId}
      isLoading={item.id === resolvingId}
      onPress={() => {
        const index = visibleResults.findIndex(t => t.id === item.id);
        onSelectTrack(item, visibleResults, index);
      }}
      onLongPress={() => showAddToPlaylist(item)}
      showMenuIcon={true}
      disabled={item.id === resolvingId}
      rightSlot={
        item.id === resolvingId ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : item.id === activeTrackId ? (
          <View style={styles.playingBadge}>
            <Text style={styles.playingText}>PLAYING</Text>
          </View>
        ) : item.duration_ms ? (
          <Text style={styles.durationText}>
            {formatDuration(item.duration_ms)}
          </Text>
        ) : undefined
      }
    />
  ), [onSelectTrack, activeTrackId, resolvingId, showAddToPlaylist]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 64,
    offset: 64 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      {/* Sticky header + search bar */}
      <View style={styles.stickyTop}>
        <Text style={styles.heading}>Search</Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            placeholder="What do you want to listen to?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityRole="search"
            accessibilityLabel="Search music"
          />
          {query.length > 0 && (
            <IconButton
              icon={<X size={14} color={colors.textMuted} />}
              onPress={handleClear}
              variant="ghost"
              size="sm"
              style={styles.clearBtn}
              accessibilityLabel="Clear search"
            />
          )}
        </View>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {/* List area */}
      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.stateText}>Searching...</Text>
        </View>
      ) : showTypePrompt ? (
        <View style={styles.centeredState}>
          <Music size={48} color={colors.surfaceElevated} />
          <Text style={styles.stateTitle}>Find your music</Text>
          <Text style={styles.stateText}>Search for any song or artist</Text>
        </View>
      ) : showNoResults ? (
        <View style={styles.centeredState}>
          <SearchX size={48} color={colors.surfaceElevated} />
          <Text style={styles.stateTitle}>No results</Text>
          <Text style={styles.stateText}>No results for "{query.trim()}"</Text>
        </View>
      ) : (
        <AnyFlashList
          data={visibleResults}
          keyExtractor={(item: RemoteTrack) => item.id}
          style={styles.list}
          contentContainerStyle={StyleSheet.flatten(styles.listContent)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          estimatedItemSize={64}
          renderItem={renderTrack}
        />
      )}
    </View>
  );
}

SearchScreen.displayName = 'SearchScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stickyTop: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.background,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  clearBtn: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    width: 28,
    height: 28,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: 180,
  },
  // Centered states
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stateTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  // Duration text
  durationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  // Playing badge
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
});
