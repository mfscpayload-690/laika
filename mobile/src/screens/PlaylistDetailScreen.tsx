import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, MoreVertical, Play, Trash2, Music } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlaylists } from '../context/PlaylistContext';
import { usePlayback } from '../context/PlaybackContext';
import { TrackRow } from '../components/TrackRow';
import { colors, radii, spacing, typography } from '../theme';
import type { PlaylistTrack } from '../services/libraryService';

export function PlaylistDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { playlistId, title } = route.params;
  
  const { getTracks, removeTrack, deletePlaylist } = usePlaylists();
  const { playRemote } = usePlayback();
  
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const data = await getTracks(playlistId);
      setTracks(data);
    } catch (error) {
      console.error('[PlaylistDetail] fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [playlistId]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      // Map PlaylistTrack to RemoteTrack format for playback
      const firstTrack = tracks[0];
      playRemote({
        id: firstTrack.track_id,
        title: firstTrack.track_metadata.title,
        artist: firstTrack.track_metadata.artist,
        thumbnail: firstTrack.track_metadata.artwork || '',
        album: firstTrack.track_metadata.album,
        duration_ms: firstTrack.track_metadata.duration || 0,
        source: firstTrack.track_metadata.source,
      });
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await removeTrack(playlistId, trackId);
      setTracks(prev => prev.filter(t => t.track_id !== trackId));
    } catch (error) {
      console.error('[PlaylistDetail] remove track error:', error);
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist(playlistId);
      navigation.goBack();
    } catch (error) {
      console.error('[PlaylistDetail] delete playlist error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Pressable onPress={handleDeletePlaylist} style={styles.menuBtn}>
          <Trash2 size={20} color={colors.error} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.playlistArtLarge}>
                <Music size={64} color={colors.surfaceElevated} />
              </View>
              <Text style={styles.playlistNameLarge}>{title}</Text>
              <Text style={styles.playlistStats}>{tracks.length} tracks • Custom Playlist</Text>
              
              <Pressable style={styles.playAllBtn} onPress={handlePlayAll}>
                <Play size={20} color="#000" fill="#000" />
                <Text style={styles.playAllText}>Play All</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <TrackRow
              title={item.track_metadata.title}
              artist={item.track_metadata.artist}
              thumbnail={item.track_metadata.artwork}
              onPress={() => {
                playRemote({
                  id: item.track_id,
                  title: item.track_metadata.title,
                  artist: item.track_metadata.artist,
                  thumbnail: item.track_metadata.artwork || '',
                  album: item.track_metadata.album,
                  duration_ms: item.track_metadata.duration || 0,
                  source: item.track_metadata.source,
                });
              }}
              rightSlot={
                <Pressable onPress={() => handleRemoveTrack(item.track_id)} style={styles.rowAction}>
                  <Trash2 size={16} color={colors.textMuted} />
                </Pressable>
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>This playlist is empty.</Text>
              <Text style={styles.emptySub}>Add some tracks from Search or Home!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  menuBtn: {
    padding: spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  playlistArtLarge: {
    width: 180,
    height: 180,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  playlistNameLarge: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  playlistStats: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: radii.full,
    gap: 8,
  },
  playAllText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 120,
  },
  rowAction: {
    padding: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
});
