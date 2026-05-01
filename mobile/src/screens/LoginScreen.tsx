import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { User } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing, typography } from '../theme';

function GithubIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <Path d="M9 18c-4.51 2-5-2-7-2" />
    </Svg>
  );
}

function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

const { width, height } = Dimensions.get('window');

export function LoginScreen() {
  const { setAsGuest, signInWithOAuth } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = React.useState<string | null>(null);
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
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={15}
          overlayColor="rgba(0, 0, 0, 0.3)"
        />

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.logoGlow} />
            </View>
            <Text style={styles.title}>Laika Music</Text>
            <Text style={styles.subtitle}>Your music, everywhere.</Text>
          </View>

          <View style={styles.buttonContainer}>
            <LoginButton
              icon={<GoogleIcon size={24} />}
              label="Continue with Google"
              loading={isLoggingIn === 'google'}
              onPress={async () => {
                try {
                  setIsLoggingIn('google');
                  await signInWithOAuth('google');
                } catch (err) {
                  Alert.alert('Login Error', (err as Error).message);
                } finally {
                  setIsLoggingIn(null);
                }
              }}
            />
            <LoginButton
              icon={<GithubIcon size={24} />}
              label="Continue with GitHub"
              loading={isLoggingIn === 'github'}
              onPress={async () => {
                try {
                  setIsLoggingIn('github');
                  await signInWithOAuth('github');
                } catch (err) {
                  Alert.alert('Login Error', (err as Error).message);
                } finally {
                  setIsLoggingIn(null);
                }
              }}
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

function LoginButton({ icon, label, onPress, loading }: { icon: any, label: string, onPress: () => void, loading?: boolean }) {
  return (
    <Pressable style={[styles.loginButton, loading && { opacity: 0.7 }]} onPress={onPress} disabled={loading}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        overlayColor="rgba(255, 255, 255, 0.1)"
      />
      <View style={styles.loginButtonContent}>
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <>
            {icon}
            <Text style={styles.loginButtonText}>{label}</Text>
          </>
        )}
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
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 90,
    height: 90,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    opacity: 0.45,
    transform: [{ scale: 1.5 }],
    zIndex: 1,
    // Add a glowing shadow effect
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 5,
  },
  title: {
    fontSize: 42,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
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
