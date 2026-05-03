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
import { useMusicStore } from '../store/musicStore';
import { useUIStore } from '../store/uiStore';
import { useSearchStore } from '../store/searchStore';

import { IconButton } from '../components/IconButton';
import { TrackRow } from '../components/TrackRow';
import { SwipeableRow } from '../components/SwipeableRow';
import { SearchBrowseView } from '../components/SearchBrowseView';
import { searchTracks, prefetchTrack } from '../services/api';
import { useLikesStore } from '../store/likesStore';
import { BouncyPressable } from '../components/BouncyPressable';
import { colors, radii, spacing, typography } from '../theme';
import { Music, Search, SearchX, X } from 'lucide-react-native';
import type { RemoteTrack } from '../types/music';


function formatDuration(ms: number): string {
  if (!ms) return '';
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
  const toggleLike = useLikesStore(state => state.toggleLike);

  const { addRecentSearch } = useSearchStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RemoteTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (tracks.length > 0) {
          const top3 = tracks.slice(0, 3);
          top3.forEach(t => prefetchTrack(t));
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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => runSearch(value), 350);
  };

  const handleSubmit = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.trim()) {
      addRecentSearch(query.trim());
      runSearch(query).catch(() => undefined);
    }
  };

  const handleClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setQuery('');
    setResults([]);
    setError(null);
  };

  const showBrowse = !loading && !error && query.trim() === '';
  const showNoResults =
    !loading && !error && query.trim() !== '' && results.length === 0;

  const visibleResults = useMemo(() => results, [results]);

  const renderTrack = useCallback(({ item }: { item: RemoteTrack }) => (
    <SwipeableRow
      onSwipeRight={() => toggleLike(item)}
      onSwipeLeft={() => showAddToPlaylist(item)}
    >
      <TrackRow
        title={item.title}
        artist={item.artist}
        album={item.album}
        thumbnail={item.thumbnail}
        isActive={item.id === activeTrackId}
        isLoading={item.id === resolvingId}
        onPress={() => {
          addRecentSearch(query.trim() || item.title);
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
    </SwipeableRow>
  ), [onSelectTrack, activeTrackId, resolvingId, showAddToPlaylist, toggleLike, visibleResults, addRecentSearch, query]);

  return (
    <View style={styles.container}>
      <View style={styles.stickyTop}>
        <Text style={styles.heading}>Search</Text>

        <View style={styles.searchBar}>
          <Search size={20} color={colors.textPrimary} strokeWidth={2.5} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            placeholder="What do you want to listen to?"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <BouncyPressable onPress={handleClear}>
              <X size={20} color={colors.textPrimary} />
            </BouncyPressable>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.stateText}>Searching...</Text>
        </View>
      ) : showBrowse ? (
        <SearchBrowseView onSearch={(q) => {
          setQuery(q);
          runSearch(q);
        }} />
      ) : showNoResults ? (
        <View style={styles.centeredState}>
          <SearchX size={48} color={colors.surfaceElevated} />
          <Text style={styles.stateTitle}>No results</Text>
          <Text style={styles.stateText}>No results for "{query.trim()}"</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <AnyFlashList
            data={visibleResults}
            keyExtractor={(item: RemoteTrack) => item.id}
            contentContainerStyle={StyleSheet.flatten(styles.listContent)}
            keyboardShouldPersistTaps="handled"
            estimatedItemSize={64}
            renderItem={renderTrack}
          />
        </View>
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
    fontSize: 28,
    fontWeight: '900',
    marginBottom: spacing.md,
    letterSpacing: -1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: 200,
  },
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
  durationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
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
});

