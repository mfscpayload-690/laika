import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  ChevronDown, 
  ChevronUp, 
  Search as SearchIcon, 
  Plus, 
  ListMusic, 
  ChevronRight, 
  Folder, 
  HardDrive, 
  Trash2,
  Heart
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaylistStore } from '../store/playlistStore';
import { useLikesStore } from '../store/likesStore';
import { useUIStore } from '../store/uiStore';
import { BouncyPressable } from '../components/BouncyPressable';
import { colors, radii, spacing, typography } from '../theme';
import { useMusicStore } from '../store/musicStore';

export default function LibraryScreen() {
  const songs = useMusicStore(state => state.songs);
  const likedTracks = useLikesStore(state => state.likedTracks);
  const playlists = usePlaylistStore(state => state.playlists);
  const createPlaylist = usePlaylistStore(state => state.createPlaylist);
  const deletePlaylist = usePlaylistStore(state => state.deletePlaylist);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleCreateFolder = async () => {
    const name = `New Folder #${playlists.length + 1}`;
    await createPlaylist(name);
  };

  const StackedCover = ({ images, type }: { images: string[], type: 'local' | 'liked' | 'playlist' }) => {
    return (
      <View style={styles.stackedContainer}>
        {/* Tier 3 (Back) - Tilted Left */}
        <View style={[styles.tierCard, styles.tier3]}>
          {images[2] ? (
            <Image source={{ uri: images[2] }} style={styles.tierImage} />
          ) : (
            <View style={styles.tierPlaceholder} />
          )}
        </View>
        {/* Tier 2 (Middle) - Tilted Right */}
        <View style={[styles.tierCard, styles.tier2]}>
          {images[1] ? (
            <Image source={{ uri: images[1] }} style={styles.tierImage} />
          ) : (
            <View style={styles.tierPlaceholder} />
          )}
        </View>
        {/* Tier 1 (Front) - Straight with vibrant border */}
        <View style={[
          styles.tierCard, 
          styles.tier1, 
          type === 'local' && styles.localFront, 
          type === 'liked' && styles.likedFront
        ]}>
          {images[0] ? (
            <Image source={{ uri: images[0] }} style={styles.tierImage} />
          ) : type === 'local' ? (
            <HardDrive size={32} color={colors.brand} />
          ) : type === 'liked' ? (
            <Heart size={32} color="#ff4b2b" fill="#ff4b2b" />
          ) : (
            <ListMusic size={32} color={colors.textSecondary} />
          )}
        </View>
      </View>
    );
  };

  const renderFolder = (item: { id: string; name: string; count: number; type: 'local' | 'liked' | 'playlist'; images: string[] }) => {
    return (
      <BouncyPressable
        key={item.id}
        style={styles.folderCard}
        onPress={() => {
          if (item.type === 'local') {
            navigation.navigate('LocalSongs');
          } else if (item.type === 'liked') {
            navigation.navigate('LikedSongs');
          } else {
            navigation.navigate('PlaylistDetail', { playlistId: item.id, title: item.name });
          }
        }}
      >
        <View style={styles.folderArt}>
          <StackedCover images={item.images} type={item.type} />
          {item.type === 'playlist' && (
            <Pressable 
              style={styles.folderDeleteBtn}
              onPress={() => deletePlaylist(item.id)}
            >
              <Trash2 size={16} color={colors.error} />
            </Pressable>
          )}
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.folderMeta}>{item.count} items</Text>
        </View>
      </BouncyPressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <BouncyPressable style={styles.addBtn} onPress={handleCreateFolder}>
          <Plus size={24} color={colors.textPrimary} />
        </BouncyPressable>
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {/* Local Files Folder */}
          {renderFolder({
            id: 'local',
            name: 'Local Files',
            count: songs.length,
            type: 'local',
            images: songs.slice(0, 3).map(s => s.artwork).filter(Boolean) as string[]
          })}

          {/* Liked Songs Folder */}
          {renderFolder({
            id: 'liked',
            name: 'Liked Songs',
            count: likedTracks.length,
            type: 'liked',
            images: likedTracks.slice(0, 3).map(t => t.track_metadata.artwork).filter(Boolean) as string[]
          })}

          {/* Custom Playlists */}
          {playlists.map(playlist => renderFolder({
            id: playlist.id,
            name: playlist.name,
            count: playlist.track_count || 0,
            type: 'playlist',
            images: playlist.top_artworks || []
          }))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  folderCard: {
    width: '48%', // More accurate for 2 columns
    marginBottom: spacing.lg,
  },
  folderArt: {
    width: '100%',
    aspectRatio: 0.85, // Better fit for vertical stack
    borderRadius: radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative',
    // Glassmorphism effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  stackedContainer: {
    width: '85%',
    height: '85%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierCard: {
    position: 'absolute',
    width: '75%', // Tighter width for vertical look
    aspectRatio: 0.75, // Pseudo vertical rectangle
    borderRadius: radii.lg, // Smoother edges
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  tier3: {
    zIndex: 1,
    transform: [{ rotate: '-12deg' }, { translateX: -20 }, { translateY: -5 }, { scale: 0.85 }],
    opacity: 0.5,
  },
  tier2: {
    zIndex: 2,
    transform: [{ rotate: '8deg' }, { translateX: 15 }, { translateY: -2 }, { scale: 0.92 }],
    opacity: 0.8,
  },
  tier1: {
    zIndex: 3,
    width: '80%', // Slightly wider front card
    aspectRatio: 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tierPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceBright,
  },
  localFront: {
    borderColor: colors.brand,
    borderWidth: 1.5,
  },
  likedFront: {
    borderColor: '#ff4b2b',
    borderWidth: 1.5,
  },
  folderInfo: {
    paddingHorizontal: 4,
  },
  folderName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  folderMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  folderDeleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radii.full,
    zIndex: 20,
  },
});
