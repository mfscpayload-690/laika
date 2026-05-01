import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideOutDown 
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { LogIn, X } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AuthPromptModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export function AuthPromptModal({ isVisible, onClose, title, message }: AuthPromptModalProps) {
  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View 
        entering={FadeIn} 
        exiting={FadeOut}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View 
        entering={SlideInDown.springify().damping(20).stiffness(120)}
        exiting={SlideOutDown}
        style={styles.container}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={25}
          overlayColor="rgba(0, 0, 0, 0.6)"
        />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <LogIn size={24} color={colors.brand} />
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
  },
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 1001,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.brand,
    height: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: typography.bold,
  },
});
