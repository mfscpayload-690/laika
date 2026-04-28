import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronRight, Library, Music, RefreshCw, Search } from 'lucide-react-native';

import { SectionHeader } from '../components/SectionHeader';
import { colors, radii, shadows, spacing, typography } from '../theme';

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
};

type MockCard = {
  id: string;
  title: string;
  artist: string;
  color: string;
};

const MOCK_RECENT: MockCard[] = [
  { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', color: '#7c3aed' },
  { id: '2', title: 'Levitating', artist: 'Dua Lipa', color: '#0369a1' },
  { id: '3', title: 'Stay', artist: 'Kid Laroi', color: '#065f46' },
  { id: '4', title: 'Peaches', artist: 'Justin Bieber', color: '#92400e' },
  { id: '5', title: 'Good 4 U', artist: 'Olivia Rodrigo', color: '#9f1239' },
];

const MOCK_SUGGESTIONS: MockCard[] = [
  { id: '1', title: 'As It Was', artist: 'Harry Styles', color: '#1d4ed8' },
  { id: '2', title: 'Heat Waves', artist: 'Glass Animals', color: '#0f766e' },
  { id: '3', title: 'Easy On Me', artist: 'Adele', color: '#7f1d1d' },
  { id: '4', title: 'Industry Baby', artist: 'Lil Nas X', color: '#4d7c0f' },
  { id: '5', title: 'Shivers', artist: 'Ed Sheeran', color: '#6b21a8' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function MusicCard({ item }: { item: MockCard }) {
  return (
    <View style={styles.musicCard}>
      <View style={[styles.musicCardArt, { backgroundColor: item.color }]}>
        <Music size={28} color="rgba(255,255,255,0.6)" />
      </View>
      <Text style={styles.musicCardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.musicCardArtist} numberOfLines={1}>
        {item.artist}
      </Text>
    </View>
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
}: HomeScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      {/* Greeting */}
      <Text style={styles.greeting}>{getGreeting()}</Text>

      {/* Quick-access grid */}
      <View style={styles.quickGrid}>
        <Pressable style={styles.quickGridItem} onPress={onOpenSearch}>
          <View style={[styles.quickGridArt, { backgroundColor: '#1DB954' }]}>
            <Search size={16} color={colors.textPrimary} />
          </View>
          <Text style={styles.quickGridLabel} numberOfLines={1}>Search Music</Text>
        </Pressable>
        <Pressable style={styles.quickGridItem} onPress={onOpenLibrary}>
          <View style={[styles.quickGridArt, { backgroundColor: '#535353' }]}>
            <Library size={16} color={colors.textPrimary} />
          </View>
          <Text style={styles.quickGridLabel} numberOfLines={1}>Your Library</Text>
        </Pressable>
        <Pressable
          style={[styles.quickGridItem, scanning && styles.quickGridItemDisabled]}
          onPress={onScan}
          disabled={scanning}>
          <View style={[styles.quickGridArt, { backgroundColor: '#282828' }]}>
            {scanning ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <RefreshCw size={16} color={colors.textPrimary} />
            )}
          </View>
          <Text style={styles.quickGridLabel} numberOfLines={1}>
            {scanning ? 'Scanning...' : 'Scan Device'}
          </Text>
        </Pressable>
        {hasCurrentSong && (
          <Pressable style={styles.quickGridItem} onPress={onOpenPlayer}>
            <View style={[styles.quickGridArt, { backgroundColor: '#1DB954' }]}>
              <Music size={16} color={colors.textPrimary} />
            </View>
            <Text style={styles.quickGridLabel} numberOfLines={1}>Now Playing</Text>
          </Pressable>
        )}
      </View>

      {/* Now Playing card */}
      {hasCurrentSong && (
        <Pressable
          style={styles.nowPlayingCard}
          onPress={onOpenPlayer}
          accessibilityRole="button"
          accessibilityLabel="Now playing">
          {nowPlayingThumbnail ? (
            <Image
              source={{ uri: nowPlayingThumbnail }}
              style={styles.nowPlayingThumb}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.nowPlayingThumbFallback}>
              <Music size={20} color={colors.brand} />
            </View>
          )}
          <View style={styles.nowPlayingText}>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>
              {nowPlayingTitle ?? 'Unknown Track'}
            </Text>
            <Text style={styles.nowPlayingArtist} numberOfLines={1}>
              {nowPlayingArtist ?? 'Unknown Artist'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>
      )}

      {/* Recently Played */}
      <View>
        <SectionHeader label="Recently Played" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}>
          {MOCK_RECENT.map(item => (
            <MusicCard key={item.id} item={item} />
          ))}
        </ScrollView>
      </View>

      {/* Suggested */}
      <View>
        <SectionHeader label="Made For You" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}>
          {MOCK_SUGGESTIONS.map(item => (
            <MusicCard key={item.id} item={item} />
          ))}
        </ScrollView>
      </View>

      {/* Stats footer */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{songsCount}</Text>
          <Text style={styles.statLabel}>Local Songs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, hasCurrentSong && styles.statValueActive]}>
            {hasCurrentSong ? 'Live' : 'Idle'}
          </Text>
          <Text style={styles.statLabel}>Playback</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  // Greeting
  greeting: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.sm,
  },

  // Quick-access grid (Spotify 2-col pill style)
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    overflow: 'hidden',
    height: 56,
  },
  quickGridItemDisabled: {
    opacity: 0.5,
  },
  quickGridArt: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGridLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    flex: 1,
  },

  // Now Playing
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  nowPlayingThumb: {
    width: 48,
    height: 48,
    borderRadius: radii.xs,
  },
  nowPlayingThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingText: {
    flex: 1,
  },
  nowPlayingTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  nowPlayingArtist: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Horizontal music cards
  horizontalList: {
    paddingRight: spacing.base,
    gap: spacing.md,
  },
  musicCard: {
    width: 140,
  },
  musicCardArt: {
    width: 140,
    height: 140,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  musicCardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  musicCardArtist: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  statValueActive: {
    color: colors.brand,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
