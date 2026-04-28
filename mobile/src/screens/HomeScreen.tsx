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
  // NEW
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

      {/* A. Hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>LAIKA MUSIC</Text>
        <Text style={styles.heroGreeting}>{getGreeting()}</Text>
        <Text style={styles.heroSubtitle}>Stream any song from YouTube or play your local collection.</Text>
        <Pressable
          style={styles.searchCTA}
          onPress={onOpenSearch}
          accessibilityRole="button"
          accessibilityLabel="Search music">
          <Search size={16} color="#fef3c7" style={{ marginRight: spacing.sm }} strokeWidth={2.5} />
          <Text style={styles.searchCTALabel}>Search Music</Text>
        </Pressable>
      </View>

      {/* B. Now Playing card */}
      {hasCurrentSong && (
        <Pressable
          style={styles.nowPlayingCard}
          onPress={onOpenPlayer}
          accessibilityRole="button"
          accessibilityLabel="Now playing — tap to open player">
          <View style={styles.nowPlayingLeft}>
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
          </View>
          <View style={styles.nowPlayingMid}>
            <Text style={styles.nowPlayingKicker}>NOW PLAYING</Text>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>
              {nowPlayingTitle ?? 'Unknown Track'}
            </Text>
            <Text style={styles.nowPlayingArtist} numberOfLines={1}>
              {nowPlayingArtist ?? 'Unknown Artist'}
            </Text>
          </View>
          <View style={styles.nowPlayingRight}>
            <Text style={styles.nowPlayingCTA}>▶ Open Player</Text>
          </View>
        </Pressable>
      )}

      {/* C. Recently Played */}
      <View>
        <SectionHeader label="RECENTLY PLAYED" subtitle="Your listening history" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}>
          {MOCK_RECENT.map(item => (
            <MusicCard key={item.id} item={item} />
          ))}
        </ScrollView>
      </View>

      {/* D. Suggestions */}
      <View>
        <SectionHeader label="SUGGESTED FOR YOU" subtitle="Based on your taste" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}>
          {MOCK_SUGGESTIONS.map(item => (
            <MusicCard key={item.id} item={item} />
          ))}
        </ScrollView>
      </View>

      {/* E. Quick actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickCard}
          onPress={onOpenLibrary}
          accessibilityRole="button"
          accessibilityLabel="Open library">
          <Library size={22} color={colors.brand} style={{ marginBottom: spacing.sm }} />
          <Text style={styles.quickCardLabel}>Library</Text>
          <Text style={styles.quickCardCaption}>{songsCount} songs</Text>
        </Pressable>

        <Pressable
          style={[styles.quickCard, scanning && styles.quickCardDisabled]}
          onPress={onScan}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Scan device for audio">
          {scanning ? (
            <ActivityIndicator
              size="small"
              color={colors.brand}
              style={{ marginBottom: spacing.sm }}
            />
          ) : (
            <RefreshCw size={22} color={colors.orange} style={{ marginBottom: spacing.sm }} strokeWidth={2.5} />
          )}
          <Text style={[styles.quickCardLabel, scanning && styles.quickCardLabelMuted]}>
            {scanning ? 'Scanning...' : 'Scan Device'}
          </Text>
          <Text style={styles.quickCardCaption}>Find local audio</Text>
        </Pressable>
      </View>

      {/* F. Stats */}
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
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ChevronRight size={16} color={colors.textMuted} />
          <Text style={styles.statLabel}>Tap to explore</Text>
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

  // Hero
  heroCard: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: '#92400e',
    backgroundColor: '#1c1917',
    padding: spacing.lg,
    ...shadows.card,
    shadowColor: '#92400e',
  },
  heroKicker: {
    ...typography.label,
    color: '#fdba74',
  },
  heroGreeting: {
    marginTop: spacing.sm,
    color: '#fef3c7',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: spacing.xs,
    color: '#fed7aa',
    fontSize: 14,
    lineHeight: 20,
  },
  searchCTA: {
    marginTop: spacing.base,
    borderRadius: radii.md,
    backgroundColor: colors.orange,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCTALabel: {
    color: '#fff7ed',
    fontWeight: '700',
    fontSize: 14,
  },

  // Now Playing
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBlueBorder,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  nowPlayingLeft: {},
  nowPlayingThumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
  },
  nowPlayingThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.deepBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBlueBorder,
  },
  nowPlayingMid: {
    flex: 1,
  },
  nowPlayingKicker: {
    ...typography.label,
    color: colors.textMuted,
  },
  nowPlayingTitle: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  nowPlayingArtist: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  nowPlayingRight: {},
  nowPlayingCTA: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },

  // Horizontal music cards
  horizontalList: {
    paddingRight: spacing.base,
    gap: spacing.md,
  },
  musicCard: {
    width: 120,
  },
  musicCardArt: {
    width: 120,
    height: 80,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  musicCardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  musicCardArtist: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickCard: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: colors.surface,
    padding: spacing.base,
    alignItems: 'center',
    ...shadows.card,
  },
  quickCardDisabled: {
    opacity: 0.6,
  },
  quickCardLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardLabelMuted: {
    color: colors.textMuted,
  },
  quickCardCaption: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    color: colors.active,
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
});
