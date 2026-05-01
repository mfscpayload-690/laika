import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../theme';
import { LyricLine, parseLRC, findActiveLine } from '../utils/lyrics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SyncedLyricsProps {
  syncedLrc?: string;
  plainLyrics?: string;
  currentTimeMs: number;
  onSeek: (timeMs: number) => void;
  isLoading?: boolean;
  isStatic?: boolean;
  containerRef?: React.RefObject<any>;
}

export function SyncedLyrics({
  syncedLrc,
  plainLyrics,
  currentTimeMs,
  onSeek,
  isLoading,
  isStatic,
  containerRef,
}: SyncedLyricsProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const lyrics = useMemo(() => parseLRC(syncedLrc || ''), [syncedLrc]);
  const activeIndex = findActiveLine(lyrics, currentTimeMs);
  const isUserScrolling = useRef(false);
  const userScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (isStatic && containerRef?.current) {
      const lineOffset = activeIndex * 64;
      containerRef.current.scrollTo({
        y: 450 + lineOffset,
        animated: true,
      });
    } else if (activeIndex >= 0 && scrollViewRef.current && !isUserScrolling.current) {
      try {
        scrollViewRef.current.scrollTo({
          y: Math.max(0, activeIndex * 60 - 150),
          animated: true,
        });
      } catch (e) {
        // Ignore scroll errors
      }
    }
  }, [activeIndex, isStatic, containerRef]);

  const handleUserScroll = () => {
    isUserScrolling.current = true;
    if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
    userScrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 3000);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!syncedLrc && !plainLyrics) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No lyrics found for this track</Text>
      </View>
    );
  }

  // If only plain lyrics are available
  if (!syncedLrc && plainLyrics) {
    if (isStatic) {
      return (
        <View style={styles.plainContainer}>
          {plainLyrics.split('\n').map((item, i) => (
            <Text key={`plain-${i}`} style={styles.plainLine}>{item}</Text>
          ))}
        </View>
      );
    }
    return (
      <ScrollView
        contentContainerStyle={styles.plainContainer}
        showsVerticalScrollIndicator={false}
      >
        {plainLyrics.split('\n').map((item, i) => (
          <Text key={`plain-${i}`} style={styles.plainLine}>{item}</Text>
        ))}
      </ScrollView>
    );
  }



  return (
    <ScrollView
      ref={scrollViewRef}
      onScrollBeginDrag={handleUserScroll}
      contentContainerStyle={styles.syncContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!isStatic}
    >
      {lyrics.map((item, index) => (
        <LyricItem
          key={`sync-${index}`}
          item={item}
          isActive={index === activeIndex}
          onPress={() => onSeek(item.time)}
        />
      ))}
    </ScrollView>
  );
}

const LyricItem = React.memo(({ item, isActive, onPress }: { item: LyricLine; isActive: boolean; onPress: () => void }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.05 : 1);
    opacity.value = withSpring(isActive ? 1 : 0.4);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.lyricLine, animatedStyle]}>
        <Text style={[styles.lyricText, isActive && styles.lyricTextActive]}>
          {item.text}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  plainContainer: {
    padding: spacing.lg,
  },
  plainLine: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  syncContainer: {
    paddingTop: spacing.md,
    paddingBottom: SCREEN_HEIGHT * 0.5, // Enough padding at bottom to scroll final lyrics up
    paddingHorizontal: spacing.lg,
  },
  lyricLine: {
    height: 60,
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  lyricText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  lyricTextActive: {
    color: colors.brand,
  },
});
