import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
} from 'react-native';
import { ChevronRight, Library, Music, RefreshCw, Search, Play } from 'lucide-react-native';

import { SectionHeader } from '../components/SectionHeader';
import { colors, radii, spacing, typography } from '../theme';
import { RemoteTrack } from '../types/music';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeSection = {
  title: string;
  type: string;
  items: RemoteTrack[];
};

type HomeScreenProps = {
  songsCount: number;
  onScan: () => void;
  scanning: boolean;
  onOpenLibrary: () => void;
  onOpenPlayer: () => void;
  hasCurrentSong: boolean;
  nowPlayingTitle?: string;
  nowPlayingArtist?: string;
  nowPlayingThumbnail?: string;
  onOpenSearch: () => void;
  onPlayTrack?: (track: RemoteTrack) => void;
  currentTrackId?: string | null;
  activeRemoteTrackId?: string | null;
  resolvingId?: string | null;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function QuickPickItem({ track, onPress, isActive, isResolving }: { track: RemoteTrack; onPress: () => void; isActive?: boolean; isResolving?: boolean }) {
  return (
    <Pressable style={[styles.quickPickItem, isActive && styles.quickPickActive]} onPress={onPress}>
      <Image source={{ uri: track.thumbnail }} style={styles.quickPickArt} />
      <View style={styles.quickPickText}>
        <Text style={[styles.quickPickTitle, isActive && styles.quickPickTitleActive]} numberOfLines={1}>
          {track.title}
        </Text>
      </View>
      {isResolving ? (
        <ActivityIndicator size="small" color={colors.brand} style={{ marginRight: 12 }} />
      ) : isActive ? (
        <View style={styles.activeDot} />
      ) : null}
    </Pressable>
  );
}

function MusicCarouselItem({ item, onPress, isResolving }: { item: RemoteTrack; onPress: () => void; isResolving?: boolean }) {
  return (
    <Pressable style={styles.carouselItem} onPress={onPress}>
      <View style={styles.carouselArtContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.carouselArt} />
        {isResolving ? (
          <View style={[StyleSheet.absoluteFill, styles.carouselLoadingOverlay]}>
            <ActivityIndicator size="small" color={colors.brand} />
          </View>
        ) : (
          <View style={styles.carouselPlayOverlay}>
            <Play size={20} color="#FFF" fill="#FFF" />
          </View>
        )}
      </View>
      <Text style={styles.carouselTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.carouselArtist} numberOfLines={1}>{item.artist}</Text>
    </Pressable>
  );
}

export function HomeScreen({
  songsCount,
  onScan,
  scanning,
  onOpenLibrary,
  onOpenPlayer,
  hasCurrentSong,
  nowPlayingTitle,
  nowPlayingArtist,
  nowPlayingThumbnail,
  onOpenSearch,
  onPlayTrack,
  currentTrackId,
  activeRemoteTrackId,
  resolvingId,
}: HomeScreenProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchUrl = user?.id 
      ? `${API_BASE_URL}/home/?user_id=${user.id}`
      : `${API_BASE_URL}/home/`;

    fetch(fetchUrl)
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.sections) {
          setSections(data.sections);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('HomeScreen: fetch failed', err.message || err);
        setLoading(false);
      });
  }, [user?.id]);

  const handlePlay = (track: RemoteTrack) => {
    if (onPlayTrack) {
      onPlayTrack(track);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      
      {/* Greeting Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Pressable onPress={onOpenSearch} style={styles.iconButton}>
          <Search size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <SectionHeader label={section.title} />
            
            {section.type === 'grid' ? (
              <View style={styles.quickGrid}>
                {section.items.slice(0, 8).map(track => (
                  <QuickPickItem 
                    key={track.id} 
                    track={track} 
                    onPress={() => handlePlay(track)} 
                    isActive={track.id === currentTrackId || track.id === activeRemoteTrackId}
                    isResolving={track.id === resolvingId}
                  />
                ))}
              </View>
            ) : (
              <FlatList
                horizontal
                data={section.items}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <MusicCarouselItem 
                    item={item} 
                    onPress={() => handlePlay(item)} 
                    isResolving={item.id === resolvingId}
                  />
                )}
                contentContainerStyle={styles.carouselList}
              />
            )}
          </View>
        ))
      )}

      {/* Library Stats / Call to Action */}
      <View style={styles.libraryCard}>
        <View style={styles.libraryText}>
          <Text style={styles.libraryTitle}>Local Library</Text>
          <Text style={styles.libraryCount}>{songsCount} songs scanned</Text>
        </View>
        <Pressable 
          style={[styles.scanButton, scanning && styles.buttonDisabled]} 
          onPress={onScan}
          disabled={scanning}>
          {scanning ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <RefreshCw size={16} color="#FFF" />
              <Text style={styles.scanButtonText}>Scan</Text>
            </>
          )}
        </Pressable>
      </View>
      
      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl * 2, paddingBottom: spacing.xxxl * 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  iconButton: { padding: spacing.xs },
  
  // Quick Pick Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.xl },
  quickPickItem: { 
    width: '48.5%', 
    height: 56, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: radii.md, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  quickPickArt: { width: 56, height: 56 },
  quickPickText: { flex: 1, paddingHorizontal: spacing.sm },
  quickPickTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  quickPickTitleActive: { color: colors.brand },
  quickPickActive: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand, marginRight: 8 },
  
  // Carousel
  section: { marginBottom: spacing.xl },
  carouselList: { paddingLeft: 0 },
  carouselItem: { width: 140, marginRight: spacing.lg },
  carouselArtContainer: { width: 140, height: 140, borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.sm, position: 'relative' },
  carouselLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  carouselArt: { width: '100%', height: '100%' },
  carouselPlayOverlay: { 
    position: 'absolute', 
    bottom: 8, 
    right: 8, 
    backgroundColor: colors.brand, 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  carouselTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  carouselArtist: { color: colors.textSecondary, fontSize: 12, opacity: 0.7, marginTop: 2 },
  
  loadingContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  
  // Library Card
  libraryCard: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: radii.xl, 
    padding: spacing.lg, 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  libraryText: { flex: 1 },
  libraryTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  libraryCount: { color: colors.textSecondary, fontSize: 13, opacity: 0.6, marginTop: 2 },
  scanButton: { 
    flexDirection: 'row', 
    backgroundColor: colors.brand, 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: radii.full, 
    alignItems: 'center',
  },
  scanButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13, marginLeft: spacing.xs },
  buttonDisabled: { opacity: 0.5 },
});
