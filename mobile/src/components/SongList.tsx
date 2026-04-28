import React from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {Music, AudioLines} from 'lucide-react-native';

import type {LocalSong} from '../types/music';

type SongListProps = {
  songs: LocalSong[];
  currentTrackId?: string;
  onPressSong: (songId: string) => void;
  emptyMessage?: string;
  showPath?: boolean;
};

function extractFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function SongList({
  songs,
  currentTrackId,
  onPressSong,
  emptyMessage = 'No local songs found yet.',
  showPath = false,
}: SongListProps) {
  return (
    <FlatList
      data={songs}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      renderItem={({item, index}) => {
        const isActive = item.id === currentTrackId;

        return (
          <Pressable
            style={[styles.row, isActive && styles.activeRow]}
            onPress={() => onPressSong(item.id)}
            accessibilityRole="button">
            <View style={[styles.indexBadge, isActive && styles.indexBadgeActive]}>
              {isActive ? (
                <AudioLines size={14} color="#22d3ee" strokeWidth={3} />
              ) : (
                <Music size={14} color="#94a3b8" />
              )}
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.artist}
              </Text>
              {showPath ? (
                <Text style={styles.path} numberOfLines={1}>
                  {extractFileName(item.path)}
                </Text>
              ) : null}
            </View>

            {isActive ? (
              <View style={styles.playingIndicator}>
                <Text style={styles.playingText}>PLAYING</Text>
              </View>
            ) : (
              <View style={styles.stateDot} />
            )}
          </Pressable>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  row: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeRow: {
    borderColor: '#22d3ee',
    backgroundColor: '#0b2535',
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#020617',
  },
  indexBadgeActive: {
    borderColor: '#22d3ee',
    backgroundColor: '#083344',
  },
  indexLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    color: '#cbd5e1',
  },
  path: {
    marginTop: 2,
    fontSize: 11,
    color: '#94a3b8',
  },
  stateDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#334155',
  },
  stateDotActive: {
    backgroundColor: '#22d3ee',
  },
  empty: {
    marginTop: 20,
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  playingIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#083344',
    borderWidth: 1,
    borderColor: '#0e7490',
  },
  playingText: {
    color: '#22d3ee',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
