import React, { useEffect, useState, memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
const AnyFlashList = FlashList as any;
import { Search, WifiOff, RefreshCw, User, Play } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useMusicStore } from '../store/musicStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

import { SectionHeader } from '../components/SectionHeader';
import { colors, radii, spacing } from '../theme';
import { RemoteTrack } from '../types/music';
import { API_BASE_URL } from '../services/api';
import { BouncyPressable } from '../components/BouncyPressable';

type HomeSection = {
  title: string;
  type: string;
  items: RemoteTrack[];
};

type HomeScreenProps = {
  songsCount: number;
  onScan: () => void;
  scanning: boolean;
  isOffline: boolean;
  onOpenSearch: () => void;
  onOpenProfile?: () => void;
  onPlayTrack?: (track: RemoteTrack) => void;
  currentTrackId?: string | null;
  activeRemoteTrackId?: string | null;
  resolvingId?: string | null;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

const CAROUSEL_ITEM_WIDTH = 140;
const CAROUSEL_ITEM_SIZE = CAROUSEL_ITEM_WIDTH + spacing.lg;

const QuickPickItem = memo(
  ({ track, onPressTrack, onLongPressTrack, isActive, isResolving }: { 
    track: RemoteTrack; 
    onPressTrack: (track: RemoteTrack) => void; 
    onLongPressTrack?: (track: RemoteTrack) => void; 
    isActive?: boolean; 
    isResolving?: boolean 
  }) => {
    const handlePress = useCallback(() => {
      onPressTrack(track);
    }, [onPressTrack, track]);

    const handleLongPress = useCallback(() => {
      if (onLongPressTrack) {
        onLongPressTrack(track);
      }
    }, [onLongPressTrack, track]);

    return (
      <BouncyPressable
        style={[styles.quickPickItem, isActive && styles.quickPickActive]}
        onPress={handlePress}
        onLongPress={onLongPressTrack ? handleLongPress : undefined}
      >
        <Image source={{ uri: track.thumbnail }} style={styles.quickPickArt} />
        <View style={styles.quickPickText}>
          <Text style={[styles.quickPickTitle, isActive && styles.quickPickTitleActive]} numberOfLines={1}>
            {track.title}
          </Text>
        </View>
        {isResolving ? (
          <ActivityIndicator size="small" color={colors.brand} style={styles.resolvingIndicator} />
        ) : isActive ? (
          <View style={styles.activeDot} />
        ) : null}
      </BouncyPressable>
    );
  },
  (prev, next) =>
    prev.track.id === next.track.id &&
    prev.isActive === next.isActive &&
    prev.isResolving === next.isResolving &&
    prev.onPressTrack === next.onPressTrack &&
    prev.onLongPressTrack === next.onLongPressTrack
);

const MusicCarouselItem = memo(
  ({ item, onPressTrack, onLongPressTrack, isResolving }: { 
    item: RemoteTrack; 
    onPressTrack: (track: RemoteTrack) => void; 
    onLongPressTrack?: (track: RemoteTrack) => void; 
    isResolving?: boolean 
  }) => {
    const handlePress = useCallback(() => {
      onPressTrack(item);
    }, [onPressTrack, item]);

    const handleLongPress = useCallback(() => {
      if (onLongPressTrack) {
        onLongPressTrack(item);
      }
    }, [onLongPressTrack, item]);

    return (
      <BouncyPressable style={styles.carouselItem} onPress={handlePress} onLongPress={onLongPressTrack ? handleLongPress : undefined} scaleTo={0.97}>
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
      </BouncyPressable>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.isResolving === next.isResolving &&
    prev.onPressTrack === next.onPressTrack &&
    prev.onLongPressTrack === next.onLongPressTrack
);

function HomeScreen() {
  const navigation = useNavigation<any>();
  
  // Zustand State
  const songs = useMusicStore(state => state.songs);
  const scanning = useMusicStore(state => state.scanning);
  const isOffline = useMusicStore(state => state.isOffline);
  const currentTrackId = useMusicStore(state => state.currentTrackId);
  const activeRemoteTrackId = useMusicStore(state => state.activeRemoteTrack?.id);
  const resolvingId = useMusicStore(state => state.isResolving ? state.activeRemoteTrack?.id : null);
  const onScan = useMusicStore(state => state.startScan);
  const onPlayTrack = useMusicStore(state => state.playRemote);
  const user = useAuthStore(state => state.user);
  const showAddToPlaylist = useUIStore(state => state.showAddToPlaylist);

  const songsCount = songs.length;
  const onOpenSearch = () => navigation.navigate('Search');
  const onOpenProfile = () => navigation.navigate('Settings');
  
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let deferredTask: { cancel: () => void } | null = null;
    setLoading(true);
    const fetchUrl = user?.id
      ? `${API_BASE_URL}/home/?user_id=${user.id}`
      : `${API_BASE_URL}/home/`;

    const performFetch = async () => {
      try {
        console.log('[HomeScreen] Fetching from:', fetchUrl);
        const res = await fetch(fetchUrl);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[HomeScreen] HTTP Error ${res.status}:`, errorText);
          if (mounted) setLoading(false);
          return;
        }

        const data = await res.json();
        console.log('[HomeScreen] Data received, sections:', data?.sections?.length || 0);

        if (!mounted) return;

        deferredTask = InteractionManager.runAfterInteractions(() => {
          if (!mounted) return;
          setSections(Array.isArray(data.sections) ? data.sections : []);
          setLoading(false);
        });
      } catch (err: any) {
        console.error('[HomeScreen] Fetch exception:', err.message || err);
        if (mounted) setLoading(false);
      }
    };

    // Tiny delay to let adb reverse settle
    const timeoutId = setTimeout(performFetch, 150);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (deferredTask) deferredTask.cancel();
    };
  }, [user?.id]);

  const handlePlay = useCallback((track: RemoteTrack) => {
    if (onPlayTrack) {
      const section = sections.find(s => s.items.some(item => item.id === track.id));
      if (section) {
        const index = section.items.findIndex(item => item.id === track.id);
        onPlayTrack(track, section.items, index);
      } else {
        onPlayTrack(track);
      }
    }
  }, [onPlayTrack, sections]);

  const renderCarouselItem = useCallback(({ item }: { item: RemoteTrack }) => (
    <MusicCarouselItem
      item={item}
      onPressTrack={handlePlay}
      onLongPressTrack={showAddToPlaylist}
      isResolving={item.id === resolvingId}
    />
  ), [handlePlay, showAddToPlaylist, resolvingId]);

  const keyExtractor = useCallback((item: RemoteTrack, index: number) => `${item.id}-${index}`, []);

  const getCarouselItemLayout = useCallback((_: unknown, index: number) => {
    return {
      index,
      length: CAROUSEL_ITEM_SIZE,
      offset: CAROUSEL_ITEM_SIZE * index,
    };
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Greeting Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}
          </Text>
          <View style={styles.headerButtons}>
            <BouncyPressable onPress={onOpenSearch} style={styles.iconButton}>
              <Search size={24} color={colors.textPrimary} />
            </BouncyPressable>
            <BouncyPressable onPress={onOpenProfile} style={styles.profileButton}>
              {user?.user_metadata?.avatar_url ? (
                <Image
                  source={{ uri: user.user_metadata.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <User size={24} color={colors.textPrimary} />
              )}
            </BouncyPressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          sections.map(section => (
            <View key={`${section.type}-${section.title}`} style={styles.section}>
              <SectionHeader label={section.title} />

              {section.type === 'grid' ? (
                <View style={styles.quickGrid}>
                  {section.items.slice(0, 6).map((track, index) => (
                    <QuickPickItem
                      key={`${track.id}-${index}`}
                      track={track}
                      onPressTrack={handlePlay}
                      onLongPressTrack={showAddToPlaylist}
                      isActive={track.id === currentTrackId || track.id === activeRemoteTrackId}
                      isResolving={track.id === resolvingId}
                    />
                  ))}
                </View>
              ) : (
                <AnyFlashList
                  horizontal
                  data={section.items}
                  keyExtractor={keyExtractor}
                  showsHorizontalScrollIndicator={false}
                  renderItem={renderCarouselItem}
                  estimatedItemSize={CAROUSEL_ITEM_SIZE}
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
          <BouncyPressable
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
          </BouncyPressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {isOffline && (
        <Animated.View
          entering={FadeInDown}
          exiting={FadeOutUp}
          style={styles.offlineBanner}
        >
          <WifiOff size={14} color="#000" />
          <Text style={styles.offlineText}>Offline Mode — Playing from Cache</Text>
        </Animated.View>
      )}
    </View>
  );
}

function areHomeScreenPropsEqual(prev: HomeScreenProps, next: HomeScreenProps): boolean {
  return (
    prev.songsCount === next.songsCount &&
    prev.scanning === next.scanning &&
    prev.isOffline === next.isOffline &&
    prev.currentTrackId === next.currentTrackId &&
    prev.activeRemoteTrackId === next.activeRemoteTrackId &&
    prev.resolvingId === next.resolvingId
  );
}




const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl * 2, paddingBottom: 180 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: spacing.xs },
  profileButton: { padding: spacing.xs, marginLeft: spacing.sm },
  avatarImage: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' },

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
  resolvingIndicator: { marginRight: 12 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand, marginRight: 8 },

  // Carousel
  section: { marginBottom: spacing.xl },
  carouselList: { paddingLeft: 0 },
  carouselItem: { width: CAROUSEL_ITEM_WIDTH, marginRight: spacing.lg },
  carouselArtContainer: { width: CAROUSEL_ITEM_WIDTH, height: CAROUSEL_ITEM_WIDTH, borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.sm, position: 'relative' },
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
  bottomSpacer: { height: 120 },
  offlineBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    gap: spacing.xs,
    zIndex: 100,
    elevation: 5,
  },
  offlineText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HomeScreen;
