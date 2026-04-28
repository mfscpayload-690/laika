import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {ChevronRight, Library, Music, RefreshCw} from 'lucide-react-native';

type HomeScreenProps = {
  songsCount: number;
  onScan: () => void;
  scanning: boolean;
  onOpenLibrary: () => void;
  onOpenPlayer: () => void;
  hasCurrentSong: boolean;
};

type ActionButtonProps = {
  label: string;
  caption: string;
  Icon: React.ElementType;
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({label, caption, Icon, onPress, disabled}: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      accessibilityRole="button">
      <View style={styles.actionRow}>
        <View style={styles.actionTextContent}>
          <Text style={[styles.actionLabel, disabled && styles.actionLabelDisabled]}>{label}</Text>
          <Text style={[styles.actionCaption, disabled && styles.actionCaptionDisabled]}>
            {caption}
          </Text>
        </View>
        <ChevronRight size={20} color={disabled ? '#4b5563' : '#7dd3fc'} />
      </View>
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
}: HomeScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>PHASE 1 FOUNDATION</Text>
        <Text style={styles.title}>Build the local-first player first.</Text>
        <Text style={styles.subtitle}>
          Scan your device, fill the library, and keep every playback action working fully offline.
        </Text>

        <Pressable
          style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
          onPress={onScan}
          disabled={scanning}
          accessibilityRole="button">
          <View style={styles.scanButtonContent}>
            <RefreshCw
              size={16}
              color="#fff7ed"
              style={{marginRight: 8}}
              strokeWidth={2.5}
            />
            <Text style={styles.scanButtonLabel}>
              {scanning ? 'Scanning Device...' : 'Scan Device Audio'}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Library Size</Text>
          <Text style={styles.statValue}>{songsCount}</Text>
          <Text style={styles.statHint}>local songs indexed</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Playback</Text>
          <Text style={styles.statValue}>{hasCurrentSong ? 'Live' : 'Idle'}</Text>
          <Text style={styles.statHint}>{hasCurrentSong ? 'track active' : 'pick a track'}</Text>
        </View>
      </View>

      <View style={styles.actionGrid}>
        <ActionButton
          label="Open Library"
          caption="Browse everything on device"
          Icon={Library}
          onPress={onOpenLibrary}
        />
        <ActionButton
          label="Open Player"
          caption="Jump to now-playing controls"
          Icon={Music}
          onPress={onOpenPlayer}
          disabled={!hasCurrentSong}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#92400e',
    backgroundColor: '#1c1917',
    padding: 18,
  },
  kicker: {
    color: '#fdba74',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: '#fef3c7',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    color: '#fed7aa',
    fontSize: 14,
    lineHeight: 20,
  },
  scanButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    opacity: 0.65,
  },
  scanButtonLabel: {
    color: '#fff7ed',
    fontWeight: '700',
    fontSize: 14,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statValue: {
    marginTop: 8,
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  statHint: {
    marginTop: 4,
    color: '#cbd5e1',
    fontSize: 12,
  },
  actionGrid: {
    gap: 10,
  },
  actionButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    backgroundColor: '#0b1a2e',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  actionButtonDisabled: {
    borderColor: '#1f2937',
    backgroundColor: '#111827',
  },
  actionLabel: {
    color: '#e0f2fe',
    fontSize: 15,
    fontWeight: '700',
  },
  actionLabelDisabled: {
    color: '#9ca3af',
  },
  actionCaption: {
    marginTop: 4,
    color: '#7dd3fc',
    fontSize: 12,
  },
  actionCaptionDisabled: {
    color: '#6b7280',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionTextContent: {
    flex: 1,
  },
});
