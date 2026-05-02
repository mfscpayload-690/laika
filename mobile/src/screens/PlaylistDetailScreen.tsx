import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Edit2, Music, Play, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { FlashList, FlashListProps } from '@shopify/flash-list';

import { usePlaylistStore } from '../store/playlistStore';
import { useMusicStore } from '../store/musicStore';
import { useUIStore } from '../store/uiStore';
import { TrackRow } from '../components/TrackRow';
import { colors, radii, spacing } from '../theme';
import type { PlaylistTrack } from '../services/libraryService';

const HEADER_MAX_HEIGHT = 340;
const HEADER_MIN_HEIGHT = 100;
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

export default function PlaylistDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { playlistId, title: initialTitle } = route.params;
  
  const getTracks = usePlaylistStore(state => state.getTracks);
  const removeTrack = usePlaylistStore(state => state.removeTrack);
  const deletePlaylist = usePlaylistStore(state => state.deletePlaylist);
  const updatePlaylistName = usePlaylistStore(state => state.updatePlaylistName);
  
  const playRemote = useMusicStore(state => state.playRemote);
  const activeRemoteTrackId = useMusicStore(state => state.currentTrackId);
  
  
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(initialTitle);
  
  const scrollY = useSharedValue(0);

  const [isRenameVisible, setIsRenameVisible] = useState(false);
  const [newName, setNewName] = useState(initialTitle);
  const [isRenaming, setIsRenaming] = useState(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const fetchTracks = async () => {
    if (tracks.length === 0) setLoading(true);
    try {
      const data = await getTracks(playlistId);
      setTracks(data || []);
    } catch (error) {
      console.error('[PlaylistDetail] fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [playlistId]);

  const handlePlayAll = useCallback(() => {
    if (tracks.length > 0) {
      const queue = tracks.map(t => ({
        id: t.track_id,
        title: t.track_metadata.title,
        artist: t.track_metadata.artist,
        thumbnail: t.track_metadata.artwork || '',
        album: t.track_metadata.album,
        duration_ms: t.track_metadata.duration || 0,
        source: t.track_metadata.source,
      }));
      playRemote(queue[0], queue, 0);
    }
  }, [tracks, playRemote]);

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await removeTrack(playlistId, trackId);
      setTracks(prev => prev.filter(t => t.track_id !== trackId));
    } catch (error) {
      console.error('[PlaylistDetail] remove track error:', error);
    }
  };

  const handleRenamePlaylist = async () => {
    if (!newName.trim() || newName === title) {
      setIsRenameVisible(false);
      return;
    }
    setIsRenaming(true);
    try {
      await updatePlaylistName(playlistId, newName);
      setTitle(newName);
      setIsRenameVisible(false);
    } catch (error) {
      console.error('[PlaylistDetail] rename error:', error);
    } finally {
      setIsRenaming(false);
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

  // Reanimated Styles
  const headerBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_DISTANCE * 0.7, SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const listHeaderStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, -20],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  const artworkStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0, SCROLL_DISTANCE],
      [1.1, 1, 0.7],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }], opacity };
  });

  const metadataStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE * 0.6],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <View style={styles.container}>
      {/* Dynamic Header Background */}
      <Animated.View 
        style={[
          styles.headerBackground, 
          { paddingTop: insets.top + 10 },
          headerBgStyle
        ]} 
      />
      
      {/* Sticky Top Bar Content */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </Pressable>
        <Animated.Text style={[styles.topBarTitle, headerTitleStyle]} numberOfLines={1}>
          {title}
        </Animated.Text>
        <View style={styles.topBarActions}>
          <Pressable onPress={() => setIsRenameVisible(true)} style={styles.iconBtn}>
            <Edit2 size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={handleDeletePlaylist} style={styles.iconBtn}>
            <Trash2 size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <AnimatedFlashList
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          data={tracks}
          keyExtractor={(item: any) => item.track_id}
          estimatedItemSize={72}
          ListHeaderComponent={
            <Animated.View style={[styles.listHeader, listHeaderStyle]}>
              <Animated.View style={[styles.artContainer, artworkStyle]}>
                {tracks.length > 0 && tracks[0].track_metadata.artwork ? (
                  <Image source={{ uri: tracks[0].track_metadata.artwork }} style={styles.artImage} />
                ) : (
                  <Music size={64} color={colors.textSecondary} />
                )}
              </Animated.View>
              <Animated.View style={metadataStyle}>
                <Text style={styles.playlistName}>{title}</Text>
                <Text style={styles.playlistMeta}>
                  {tracks.length} tracks • Custom Playlist
                </Text>
              </Animated.View>
              
              <Pressable style={styles.playBtn} onPress={handlePlayAll}>
                <Play size={20} color="#000" fill="#000" />
                <Text style={styles.playText}>Play All</Text>
              </Pressable>
            </Animated.View>
          }
          renderItem={({ item, index }: any) => (
            <TrackRow
              title={item.track_metadata.title}
              artist={item.track_metadata.artist}
              thumbnail={item.track_metadata.artwork || ''}
              album={item.track_metadata.album}
              isActive={item.track_id === activeRemoteTrackId}
              onPress={() => {
                const queue = tracks.map(t => ({
                  id: t.track_id,
                  title: t.track_metadata.title,
                  artist: t.track_metadata.artist,
                  thumbnail: t.track_metadata.artwork || '',
                  album: t.track_metadata.album,
                  duration_ms: t.track_metadata.duration || 0,
                  source: t.track_metadata.source,
                }));
                playRemote(queue[index], queue, index);
              }}
              onLongPress={() => handleRemoveTrack(item.track_id)}
              showMenuIcon={true}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>This playlist is empty.</Text>
              <Text style={styles.emptySub}>Add tracks from Search or Home!</Text>
            </View>
          }
        />
      )}

      {/* Rename Modal */}
      <Modal visible={isRenameVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rename Playlist</Text>
              <Pressable onPress={() => setIsRenameVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalCancel]} onPress={() => setIsRenameVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalSave]} onPress={handleRenamePlaylist} disabled={isRenaming}>
                {isRenaming ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBackground: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 100,
    backgroundColor: colors.surface,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 100,
  },
  topBarTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: spacing.sm,
  },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconBtn: { padding: spacing.xs },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listHeader: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  artContainer: {
    width: 200,
    height: 200,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  playlistName: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  playlistMeta: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: radii.full,
    gap: 10,
  },
  playText: { color: '#000', fontSize: 16, fontWeight: '800' },
  listContent: { paddingBottom: 180 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptySub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface, width: '100%',
    borderRadius: radii.xl, padding: spacing.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.md,
    padding: spacing.md, color: colors.textPrimary, marginBottom: spacing.xl,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  modalBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  modalCancel: { backgroundColor: 'rgba(255,255,255,0.05)' },
  modalSave: { backgroundColor: colors.brand },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  saveText: { color: '#000', fontWeight: '800' },
});
