import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, Dimensions } from 'react-native';
import { History, TrendingUp, Zap, Smile, Music, Mic2, Sparkles, Disc, ChevronRight } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';
import { BouncyPressable } from './BouncyPressable';
import { useSearchStore } from '../store/searchStore';
import { useMusicStore } from '../store/musicStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - spacing.base * 3) / 2;

// Asset paths from generation
const CHARTS_IMG = { uri: 'file:///home/mfscpayload-690/.gemini/antigravity/brain/8f704f92-4280-4020-b685-98b509a7b03e/category_charts_bg_1777799564065.png' };
const NEW_RELEASES_IMG = { uri: 'file:///home/mfscpayload-690/.gemini/antigravity/brain/8f704f92-4280-4020-b685-98b509a7b03e/category_new_releases_bg_1777799538793.png' };

interface CategoryTileProps {
  title: string;
  color: string;
  icon: React.ReactNode;
  image?: any;
  onPress: () => void;
}

const CategoryTile = ({ title, color, icon, image, onPress }: CategoryTileProps) => (
  <BouncyPressable onPress={onPress} style={[styles.tile, { backgroundColor: color }]} scaleTo={0.96}>
    {image && <Image source={image} style={styles.tileImage} blurRadius={10} />}
    <View style={styles.tileOverlay}>
      <Text style={styles.tileTitle}>{title}</Text>
      <View style={styles.tileIconContainer}>
        {icon}
      </View>
    </View>
  </BouncyPressable>
);

interface SearchBrowseViewProps {
  onSearch: (query: string) => void;
}

export const SearchBrowseView = ({ onSearch }: SearchBrowseViewProps) => {
  const { recentSearches, clearRecentSearches } = useSearchStore();
  const activeRemoteTrack = useMusicStore(state => state.activeRemoteTrack);
  const currentArtist = activeRemoteTrack?.artist || 'Sombr';
  const currentArtistImg = activeRemoteTrack?.thumbnail;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <BouncyPressable onPress={clearRecentSearches}>
              <Text style={styles.clearText}>clear</Text>
            </BouncyPressable>
          </View>
          <View style={styles.recentGrid}>
            {recentSearches.map((query, idx) => (
              <BouncyPressable 
                key={`${query}-${idx}`} 
                style={styles.recentItem}
                onPress={() => onSearch(query)}
              >
                <History size={16} color={colors.textMuted} />
                <Text style={styles.recentText}>{query}</Text>
              </BouncyPressable>
            ))}
          </View>
        </View>
      )}

      {/* Popular Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Categories</Text>
        <View style={styles.grid}>
          <CategoryTile 
            title="Charts" 
            color="#9D50BB" 
            image={CHARTS_IMG}
            icon={<TrendingUp size={24} color="#FFF" opacity={0.6} />} 
            onPress={() => onSearch('Top Charts')}
          />
          <CategoryTile 
            title="New Releases" 
            color="#00C9FF" 
            image={NEW_RELEASES_IMG}
            icon={<Zap size={24} color="#FFF" opacity={0.6} />} 
            onPress={() => onSearch('New Releases')}
          />
          <CategoryTile 
            title="Moods" 
            color="#F09819" 
            icon={<Smile size={24} color="#FFF" opacity={0.6} />} 
            onPress={() => onSearch('Moods')}
          />
          <CategoryTile 
            title="Pop" 
            color="#FF512F" 
            icon={<Sparkles size={24} color="#FFF" opacity={0.6} />} 
            onPress={() => onSearch('Pop')}
          />
          <CategoryTile 
            title="Hip-Hop" 
            color="#1D976C" 
            icon={<Disc size={24} color="#FFF" opacity={0.6} />} 
            onPress={() => onSearch('Hip Hop')}
          />
          <CategoryTile 
            title="Rock" 
            color="#343434" 
            icon={<Mic2 size={24} color="#FFF" opacity={0.6} />} 
            onPress={() => onSearch('Rock')}
          />
        </View>
      </View>

      {/* Featured For You */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured For You</Text>
        <View style={styles.featureGrid}>
          <BouncyPressable 
            style={styles.featureCard}
            onPress={() => onSearch(currentArtist)}
          >
            {currentArtistImg ? (
              <Image source={{ uri: currentArtistImg }} style={styles.featureBg} />
            ) : (
              <View style={[styles.featureBg, { backgroundColor: '#2a2a2a' }]} />
            )}
            <View style={styles.featureOverlay}>
              <Text style={styles.featureLabel}>Artist of the Day:</Text>
              <Text style={styles.featureTitle}>{currentArtist}</Text>
              <View style={styles.discoverBtn}>
                <Text style={styles.discoverBtnText}>Discover</Text>
              </View>
            </View>
          </BouncyPressable>

          <BouncyPressable style={styles.featureCard} onPress={() => onSearch('Release Radar')}>
            <View style={[styles.featureBg, { backgroundColor: '#1A1A1A' }]}>
               <View style={styles.radarGrid}>
                  <View style={styles.radarBox} />
                  <View style={[styles.radarBox, { opacity: 0.6 }]} />
                  <View style={[styles.radarBox, { opacity: 0.4 }]} />
                  <View style={[styles.radarBox, { opacity: 0.8 }]} />
               </View>
            </View>
            <View style={styles.featureOverlay}>
              <View style={styles.radarHeader}>
                <Music size={16} color={colors.brand} />
                <Text style={styles.radarLabel}>Made For You</Text>
              </View>
              <Text style={styles.featureTitle}>Release Radar</Text>
              <Text style={styles.radarSub}>Personalized track mix based on your tastes.</Text>
            </View>
          </BouncyPressable>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  clearText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  // Recent
  recentGrid: {
    gap: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  recentText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  tile: {
    width: COLUMN_WIDTH,
    height: 100,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  tileImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  tileTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tileIconContainer: {
    alignSelf: 'flex-end',
  },
  // Feature Cards
  featureGrid: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  featureCard: {
    flex: 1,
    height: 200,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  featureBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  featureOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  featureLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  featureTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  discoverBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  discoverBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  // Radar Card
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  radarLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  radarSub: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
  radarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    ...StyleSheet.absoluteFillObject,
  },
  radarBox: {
    width: '50%',
    height: '50%',
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#000',
  },
});
