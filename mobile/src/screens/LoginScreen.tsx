import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { Code, Globe, User } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing, typography } from '../theme';

const { width, height } = Dimensions.get('window');

export function LoginScreen() {
  const { setAsGuest } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/login_bg.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Laika Music</Text>
            <Text style={styles.subtitle}>Your music, everywhere.</Text>
          </View>

          <View style={styles.buttonContainer}>
            <LoginButton
              icon={<Code size={24} color={colors.textPrimary} />}
              label="Continue with GitHub"
              onPress={() => {/* TODO: Supabase GitHub OAuth */ }}
            />
            <LoginButton
              icon={<Globe size={24} color={colors.textPrimary} />}
              label="Continue with Google"
              onPress={() => {/* TODO: Supabase Google OAuth */ }}
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.line} />
            </View>

            <Pressable
              style={styles.guestButton}
              onPress={setAsGuest}
            >
              <User size={20} color={colors.textSecondary} />
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

function LoginButton({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) {
  return (
    <Pressable style={styles.loginButton} onPress={onPress}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        overlayColor="rgba(255, 255, 255, 0.1)"
      />
      <View style={styles.loginButtonContent}>
        {icon}
        <Text style={styles.loginButtonText}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: height * 0.1,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 48,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  loginButton: {
    height: 60,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: typography.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    fontFamily: typography.medium,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  guestButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: typography.medium,
  },
});
