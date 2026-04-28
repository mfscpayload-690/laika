import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {SongList} from '../components/SongList';
import type {LocalSong} from '../types/music';

type LibraryScreenProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  onOpenPlayer: () => void;
};

export function LibraryScreen({
  songs,
  currentTrackId,
  onPressSong,
  onOpenPlayer,
}: LibraryScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Device Library</Text>
          <Text style={styles.subtitle}>All local files discovered by scanner</Text>
        </View>

        <Pressable
          style={[styles.playerButton, songs.length === 0 && styles.playerButtonDisabled]}
          onPress={onOpenPlayer}
          disabled={songs.length === 0}
          accessibilityRole="button">
          <Text style={styles.playerButtonLabel}>Player</Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>{songs.length} songs indexed</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>{currentTrackId ? 'Track selected' : 'No active track'}</Text>
        </View>
      </View>

      <View style={styles.listWrap}>
        <SongList
          songs={songs}
          currentTrackId={currentTrackId}
          onPressSong={onPressSong}
          emptyMessage="No local songs found yet. Tap Scan on Home to index your files."
          showPath
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
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  playerButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0284c7',
    backgroundColor: '#082f49',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerButtonDisabled: {
    opacity: 0.45,
  },
  playerButtonLabel: {
    color: '#e0f2fe',
    fontWeight: '700',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  listWrap: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#030712',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
});
