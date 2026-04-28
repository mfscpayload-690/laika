import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Search, Music} from 'lucide-react-native';

import {SongList} from '../components/SongList';
import type {LocalSong} from '../types/music';

type SearchScreenProps = {
  songs: LocalSong[];
  totalSongs: number;
  query: string;
  onQueryChange: (value: string) => void;
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  onOpenPlayer: () => void;
};

export function SearchScreen({
  songs,
  totalSongs,
  query,
  onQueryChange,
  currentTrackId,
  onPressSong,
  onOpenPlayer,
}: SearchScreenProps) {
  const hasQuery = query.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Search Local Audio</Text>
          <Text style={styles.subtitle}>Title and artist matching on indexed device songs</Text>
        </View>

        <Pressable
          style={styles.playerButton}
          onPress={onOpenPlayer}
          accessibilityRole="button">
          <Music size={16} color="#e0f2fe" />
        </Pressable>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.searchLabel}>Search query</Text>
        <View style={styles.inputContainer}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Type song title or artist"
            placeholderTextColor="#64748b"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaLabel}>{totalSongs} total songs</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaLabel}>{songs.length} results</Text>
        </View>
      </View>

      <View style={styles.listWrap}>
        <SongList
          songs={songs}
          currentTrackId={currentTrackId}
          onPressSong={onPressSong}
          emptyMessage={
            hasQuery
              ? 'No matches for this search. Try a different keyword.'
              : 'Type into search to filter your local library.'
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#94a3b8',
    fontSize: 12,
  },
  playerButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0284c7',
    backgroundColor: '#082f49',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerButtonLabel: {
    color: '#e0f2fe',
    fontSize: 12,
    fontWeight: '700',
  },
  searchCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    backgroundColor: '#0b1a2e',
    padding: 12,
  },
  searchLabel: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inputContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#020617',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    paddingVertical: 10,
    fontSize: 14,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  listWrap: {
    flex: 1,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#030712',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
});
