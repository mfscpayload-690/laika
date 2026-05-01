import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListMusic, Plus, Check, ChevronRight } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import { usePlaylists } from '../context/PlaylistContext';
import { colors, radii, spacing, typography } from '../theme';
import { BouncyPressable } from './BouncyPressable';
import type { LocalSong, RemoteTrack } from '../types/music';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AddToPlaylistModalProps = {
  visible: boolean;
  onClose: () => void;
  track: LocalSong | RemoteTrack | null;
};

export function AddToPlaylistModal({ visible, onClose, track }: AddToPlaylistModalProps) {
  const insets = useSafeAreaInsets();
  const { playlists, addTrack, createPlaylist, loading, refreshPlaylists } = usePlaylists();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Refresh playlists when modal opens to ensure we have data
  useEffect(() => {
    if (visible) {
      refreshPlaylists();
    }
  }, [visible, refreshPlaylists]);

  if (!track) {return null;}

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await addTrack(selectedId, track);
      setIsSaving(false);
      setSelectedId(null);
      onClose();
    } catch (error) {
      console.error('[AddToPlaylistModal] error:', error);
      setIsSaving(false);
    }
  };

  const handleCreateAndAdd = async () => {
    setIsSaving(true);
    try {
      const newPlaylist = await createPlaylist(`My Playlist #${playlists.length + 1}`);
      await addTrack(newPlaylist.id, track);
      setIsSaving(false);
      onClose();
    } catch (error) {
      console.error('[AddToPlaylistModal] create and add error:', error);
      setIsSaving(false);
    }
  };

  const thumbnail = 'thumbnail' in track ? track.thumbnail : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable 
          style={styles.dismiss} 
          onPress={onClose}
        />
        
        <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={30}
            reducedTransparencyFallbackColor="black"
          />
          
          <View style={styles.header}>
            <View style={styles.headerIndicator} />
            <View style={styles.headerTop}>
              <Text style={styles.title}>Add to Playlist</Text>
              <BouncyPressable onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>Cancel</Text>
              </BouncyPressable>
            </View>
          </View>

          <View style={styles.trackCard}>
            <View style={styles.trackInfo}>
              {thumbnail ? (
                <Image source={{ uri: thumbnail }} style={styles.trackArt} />
              ) : (
                <View style={styles.trackArtPlaceholder}>
                  <ListMusic size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.trackText}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
              </View>
            </View>
          </View>

          <View style={styles.listWrapper}>
            <ScrollView 
              style={styles.list} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {/* Always show Create New Playlist */}
              <BouncyPressable style={styles.playlistItem} onPress={handleCreateAndAdd} scaleTo={0.98}>
                <View style={[styles.art, styles.newArt]}>
                  <Plus size={24} color={colors.brand} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.brand }]}>Create New Playlist</Text>
                  <Text style={styles.meta}>Start a fresh collection</Text>
                </View>
                <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
              </BouncyPressable>

              <View style={styles.separator} />

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.brand} />
                </View>
              ) : playlists.length === 0 ? (
                <View style={styles.emptyState}>
                  <ListMusic size={40} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.emptyText}>No playlists yet. Create one above!</Text>
                </View>
              ) : (
                playlists.map(p => (
                  <BouncyPressable
                    key={p.id}
                    style={[styles.playlistItem, selectedId === p.id && styles.selectedItem]}
                    onPress={() => setSelectedId(p.id)}
                    scaleTo={0.98}
                  >
                    <View style={styles.art}>
                      {selectedId === p.id ? (
                        <Check size={22} color={colors.brand} />
                      ) : (
                        <ListMusic size={22} color={colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.info}>
                      <Text style={[styles.name, selectedId === p.id && { color: colors.brand }]}>{p.name}</Text>
                      <Text style={styles.meta}>{p.track_count || 0} tracks</Text>
                    </View>
                    {selectedId === p.id && <Check size={20} color={colors.brand} />}
                  </BouncyPressable>
                ))
              )}
            </ScrollView>
          </View>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
            <BouncyPressable 
              style={[styles.saveButton, !selectedId && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!selectedId || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {selectedId ? 'Add to Playlist' : 'Select a Playlist'}
                </Text>
              )}
            </BouncyPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  contentContainer: {
    backgroundColor: 'rgba(25, 25, 25, 0.95)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  headerIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: spacing.md,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  trackCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackArt: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
  },
  trackArtPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trackTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  trackArtist: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.6,
  },
  listWrapper: {
    flex: 1,
    minHeight: 200,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    marginVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  selectedItem: {
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
  },
  art: {
    width: 50,
    height: 50,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  newArt: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderColor: 'rgba(29, 185, 84, 0.2)',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.6,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.5,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
