import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Disc, ListMusic, Pause, Play, SkipBack, SkipForward} from 'lucide-react-native';

type PlayerScreenProps = {
  currentTitle: string;
  currentArtist: string;
  currentPath?: string;
  queueSize: number;
  currentIndex: number;
  isReady: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

type PlayerControlButtonProps = {
  Icon: React.ElementType;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
};

function PlayerControlButton({Icon, onPress, disabled, primary}: PlayerControlButtonProps) {
  const iconColor = primary ? '#fff7ed' : '#f1f5f9';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.controlButton,
        primary && styles.controlButtonPrimary,
        disabled && styles.controlButtonDisabled,
      ]}
      accessibilityRole="button">
      <Icon size={primary ? 26 : 22} color={iconColor} strokeWidth={2.5} />
    </Pressable>
  );
}

export function PlayerScreen({
  currentTitle,
  currentArtist,
  currentPath,
  queueSize,
  currentIndex,
  isReady,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
}: PlayerScreenProps) {
  const hasTrack = Boolean(currentPath);
  const canControl = isReady && hasTrack;

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Local Playback Engine</Text>

      <View style={styles.coverCard}>
        <Text style={styles.coverGlyph}>{currentTitle.slice(0, 1).toUpperCase() || 'L'}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {currentTitle}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {currentArtist}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <ListMusic size={12} color="#cbd5e1" style={{marginRight: 5}} />
          <Text style={styles.metaLabel}>{queueSize} in queue</Text>
        </View>
        <View style={styles.metaPill}>
          <Disc size={12} color="#cbd5e1" style={{marginRight: 5}} />
          <Text style={styles.metaLabel}>
            {currentIndex > 0 ? `Track ${currentIndex}` : 'No selection'}
          </Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <PlayerControlButton Icon={SkipBack} onPress={onPrevious} disabled={!canControl} />
        <PlayerControlButton
          Icon={isPlaying ? Pause : Play}
          onPress={isPlaying ? onPause : onPlay}
          disabled={!canControl}
          primary
        />
        <PlayerControlButton Icon={SkipForward} onPress={onNext} disabled={!canControl} />
      </View>

      <Text style={styles.statusText}>
        {isReady
          ? hasTrack
            ? 'Track player ready'
            : 'Pick a song from Search or Library to start playback'
          : 'Initializing audio engine...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  kicker: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  coverCard: {
    marginTop: 14,
    width: 210,
    height: 210,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    backgroundColor: '#082f49',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
  coverGlyph: {
    color: '#e0f2fe',
    fontSize: 94,
    fontWeight: '800',
  },
  title: {
    marginTop: 18,
    color: '#f8fafc',
    fontSize: 27,
    textAlign: 'center',
    fontWeight: '800',
    lineHeight: 33,
  },
  artist: {
    marginTop: 8,
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '500',
  },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
    minWidth: 80,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  controlButtonPrimary: {
    borderColor: '#f97316',
    backgroundColor: '#9a3412',
    minWidth: 110,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlLabel: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  controlLabelPrimary: {
    color: '#fff7ed',
  },
  controlLabelDisabled: {
    color: '#94a3b8',
  },
  statusText: {
    marginTop: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 12,
  },
});
