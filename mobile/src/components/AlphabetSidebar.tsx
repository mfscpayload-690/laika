import React, { useRef, useState, useMemo } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

interface Props {
  currentFilter: string;
  onLetterChange: (letter: string, isFinal: boolean) => void;
  onInteractStart: () => void;
  opacityAnim: Animated.Value;
}

export const AlphabetSidebar = React.memo(({ currentFilter, onLetterChange, onInteractStart, opacityAnim }: Props) => {
  const [draggingLetter, setDraggingLetter] = useState<string | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const popY = useRef(new Animated.Value(0)).current;
  const activeIndexAnim = useRef(new Animated.Value(0)).current;

  const sidebarRef = useRef<View>(null);
  const contentRef = useRef<View>(null);
  const sidebarLayout = useRef({ y: 0, height: 0 });

  // Update visual index on prop change when not dragging
  React.useEffect(() => {
    if (!draggingLetter) {
      let idx = ALPHABET.indexOf(currentFilter);
      Animated.spring(activeIndexAnim, {
        toValue: idx,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [currentFilter, draggingLetter]);

  const handleTouch = (locationY: number, isFinal: boolean) => {
    if (sidebarLayout.current.height === 0) return;

    const totalItems = ALPHABET.length;
    const itemHeight = sidebarLayout.current.height / totalItems;

    let index = Math.floor(locationY / itemHeight);
    
    // More forgiving bounds
    index = Math.max(0, Math.min(index, totalItems - 1));

    const selected = ALPHABET[index];
    
    // Animate bubble position
    popY.setValue(locationY - 27);

    if (selected !== draggingLetter) {
      if (!isFinal) setDraggingLetter(selected);
      
      Animated.spring(activeIndexAnim, {
        toValue: index,
        useNativeDriver: true,
        tension: 180, // Snappy response to finger
        friction: 12,
      }).start();
    }
    
    onLetterChange(selected, isFinal);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onInteractStart();
        handleTouch(evt.nativeEvent.locationY, false);
        Animated.spring(popAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 10,
        }).start();
      },
      onPanResponderMove: (evt) => {
        handleTouch(evt.nativeEvent.locationY, false);
      },
      onPanResponderRelease: (evt) => {
        handleTouch(evt.nativeEvent.locationY, true);
        setDraggingLetter(null);
        Animated.timing(popAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        setDraggingLetter(null);
        Animated.timing(popAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const displayLetter = draggingLetter;
  // If we are dragging, visual selection follows draggingLetter. Else follows currentFilter.
  const visualActiveLetter = draggingLetter !== null ? draggingLetter : currentFilter;

  return (
    <>
      <Animated.View
        ref={sidebarRef}
        style={[
          styles.container,
          {
            opacity: opacityAnim,
          }
        ]}>
        <View style={styles.sidebar}>
          <View 
            ref={contentRef}
            onLayout={(e) => {
              sidebarLayout.current = { y: 0, height: e.nativeEvent.layout.height };
            }}
            style={[styles.content, { width: 40 }]}
            {...panResponder.panHandlers}>
            {ALPHABET.map((letter, idx) => {
              return (
                <View key={letter} style={styles.chip} pointerEvents="none">
                  <Animated.Text
                    style={[
                      styles.label,
                      visualActiveLetter === letter && styles.labelActive,
                      {
                        transform: [{
                          scale: activeIndexAnim.interpolate({
                            inputRange: [idx - 1.5, idx, idx + 1.5],
                            outputRange: [1, 1.6, 1],
                            extrapolate: 'clamp',
                          })
                        }, {
                          translateX: activeIndexAnim.interpolate({
                            inputRange: [idx - 1.5, idx, idx + 1.5],
                            outputRange: [0, -4, 0],
                            extrapolate: 'clamp',
                          })
                        }]
                      }
                    ]}>
                    {letter}
                  </Animated.Text>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Pop Indicator */}
      {draggingLetter && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.popIndicator,
            {
              opacity: popAnim,
              transform: [
                { translateY: popY },
                { scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                { translateX: popAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }
              ]
            }
          ]}>
          <View style={styles.popBubble}>
            <Text style={styles.popText}>{displayLetter}</Text>
          </View>
        </Animated.View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 40, // Wider touch area
    justifyContent: 'center',
    marginRight: -spacing.xs,
    zIndex: 10,
  },
  sidebar: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 4, // Increased vertical spacing
  },
  chip: {
    width: 30,
    height: 16, // Increased height for easier tapping
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.brand,
    fontWeight: '900',
  },
  popIndicator: {
    position: 'absolute',
    right: 40,
    top: 0,
    zIndex: 100,
  },
  popBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  popText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.background,
  },
});
