import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { BlurView } from '@react-native-community/blur'; // Removed glassy effect
import {
  User,
  Mail,
  LogOut,
  ChevronRight,
  Music2,
  Wifi,
  Bell,
  Shield,
  Info,
  Star,
  UserX,
  Headphones,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useLikes } from '../context/LikesContext';
import { getProfile, type UserProfile } from '../services/libraryService';
import { colors, radii, spacing, typography } from '../theme';

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function SettingsRow({
  icon,
  iconColor = colors.textSecondary,
  label,
  sublabel,
  value,
  onPress,
  trailing,
  destructive = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  sublabel?: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && !disabled && { backgroundColor: 'rgba(255,255,255,0.04)' },
        disabled && { opacity: 0.45 },
      ]}
      onPress={disabled ? undefined : onPress}
      android_ripple={onPress && !disabled ? { color: 'rgba(255,255,255,0.08)' } : null}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}18` }]}>
        {icon}
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, destructive && { color: colors.error }]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <View style={styles.rowTrailing}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {trailing ?? (onPress ? <ChevronRight size={16} color={colors.textMuted} /> : null)}
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest, signOut } = useAuth();
  const { likedTracks } = useLikes();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Fetch real profile data from Supabase
  useEffect(() => {
    if (!isGuest && user) {
      getProfile()
        .then(setProfile)
        .catch(err => console.warn('[SettingsScreen] getProfile failed:', err));
    }
  }, [user, isGuest]);

  // Preferences state
  const [highQualityAudio, setHighQualityAudio] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    profile?.username ||
    user?.email?.split('@')[0] ||
    (isGuest ? 'Guest User' : 'Laika User');

  const email = profile?.email ?? user?.email ?? (isGuest ? 'Not signed in' : '');
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url;

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out of Laika Music?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: signOut,
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Page Title ─── */}
      <Text style={styles.pageTitle}>Settings</Text>

      {/* ─── Profile Card ─── */}
      <View style={styles.profileCard}>
        <View style={styles.profileCardInner}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                {isGuest ? (
                  <UserX size={32} color={colors.textMuted} />
                ) : (
                  <User size={32} color={colors.textMuted} />
                )}
              </View>
            )}
            {/* Online indicator – only for logged-in users */}
            {!isGuest && (
              <View style={styles.onlineDot} />
            )}
          </View>

          {/* Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            {email ? (
              <View style={styles.profileEmailRow}>
                <Mail size={12} color={colors.textMuted} />
                <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
              </View>
            ) : null}
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>
                {isGuest ? '🎧  Guest Mode' : '✦  Laika Account'}
              </Text>
            </View>
            {!isGuest && (
              <View style={styles.profileStats}>
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatNum}>{likedTracks.length}</Text>
                  <Text style={styles.profileStatLabel}>Liked</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ─── Audio Preferences ─── */}
      <SectionLabel label="Audio" />
      <SettingsGroup>
        <SettingsRow
          icon={<Headphones size={18} color={colors.brand} />}
          iconColor={colors.brand}
          label="High Quality Audio"
          sublabel="Uses more data over mobile networks"
          trailing={
            <Switch
              value={highQualityAudio}
              onValueChange={setHighQualityAudio}
              trackColor={{ false: colors.surfaceBright, true: colors.brandDark }}
              thumbColor={highQualityAudio ? colors.brand : colors.textMuted}
            />
          }
        />
        <Divider />
        <SettingsRow
          icon={<Wifi size={18} color={colors.warning} />}
          iconColor={colors.warning}
          label="Offline Mode"
          sublabel="Only play locally scanned songs"
          trailing={
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: colors.surfaceBright, true: colors.brandDark }}
              thumbColor={offlineMode ? colors.brand : colors.textMuted}
            />
          }
        />
        <Divider />
        <SettingsRow
          icon={<Music2 size={18} color={colors.textSecondary} />}
          iconColor={colors.textSecondary}
          label="Audio Source"
          value="YouTube"
          onPress={() =>
            Alert.alert('Audio Source', 'Only YouTube is supported at this time.')
          }
        />
      </SettingsGroup>

      {/* ─── Notifications ─── */}
      <SectionLabel label="Notifications" />
      <SettingsGroup>
        <SettingsRow
          icon={<Bell size={18} color={colors.warning} />}
          iconColor={colors.warning}
          label="Playback Notifications"
          sublabel="Show media controls in notification bar"
          trailing={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.surfaceBright, true: colors.brandDark }}
              thumbColor={notifications ? colors.brand : colors.textMuted}
            />
          }
        />
      </SettingsGroup>

      {/* ─── Privacy & Legal ─── */}
      <SectionLabel label="About" />
      <SettingsGroup>
        <SettingsRow
          icon={<Shield size={18} color={colors.textSecondary} />}
          iconColor={colors.textSecondary}
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://example.com/privacy')}
        />
        <Divider />
        <SettingsRow
          icon={<Info size={18} color={colors.textSecondary} />}
          iconColor={colors.textSecondary}
          label="App Version"
          value="0.1.0 (dev)"
        />
        <Divider />
        <SettingsRow
          icon={<Star size={18} color={colors.warning} />}
          iconColor={colors.warning}
          label="Rate Laika Music"
          onPress={() =>
            Alert.alert('Thanks! 🙏', 'Rating will be available when Laika hits the Play Store.')
          }
        />
      </SettingsGroup>

      {/* ─── Account Actions ─── */}
      <SectionLabel label="Account" />
      <SettingsGroup>
        {isGuest ? (
          <SettingsRow
            icon={<User size={18} color={colors.brand} />}
            iconColor={colors.brand}
            label="Create an Account"
            sublabel="Save your library and preferences"
            onPress={() =>
              Alert.alert('Coming Soon', 'Account registration will be available soon.')
            }
          />
        ) : (
          <>
            <SettingsRow
              icon={<User size={18} color={colors.textSecondary} />}
              iconColor={colors.textSecondary}
              label="Account Details"
              sublabel={email}
            />
            <Divider />
          </>
        )}
        <SettingsRow
          icon={<LogOut size={18} color={colors.error} />}
          iconColor={colors.error}
          label={isGuest ? 'Switch Account' : 'Sign out'}
          destructive
          onPress={handleSignOut}
        />
      </SettingsGroup>
    </ScrollView>
  );
}

SettingsScreen.displayName = 'SettingsScreen';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xl,
  },

  // ── Section label ──
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // ── Profile card ──
  profileCard: {
    borderRadius: radii.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(29,185,84,0.18)',
    backgroundColor: colors.surfaceElevated,
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  profileEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29,185,84,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginTop: 2,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
    letterSpacing: 0.3,
  },

  // ── Glass card ──
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: colors.surface,
  },
  cardInner: {
    // no extra padding — each row handles its own
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
    gap: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowSublabel: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 52 + spacing.md * 2, // align with text, not icon
  },

  // ── Profile Stats ──
  profileStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatNum: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
});
