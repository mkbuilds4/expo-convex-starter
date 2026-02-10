import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authClient } from '../../lib/auth-client';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { Text } from '../../components';

function formatMemberSince(date: Date | string | undefined): string | null {
  if (!date) return null;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { colors } = useTheme();

  const displayName = session?.user?.name?.trim() || '—';
  const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';
  const email = session?.user?.email ?? '—';
  const user = session?.user as { createdAt?: Date | string } | undefined;
  const memberSince = formatMemberSince(user?.createdAt);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="title">Profile</Text>
          <Text variant="subtitle">Your account info</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.7 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
        >
          <Ionicons name="settings-outline" size={24} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
          Account
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{initial}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [styles.editPhotoLink, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Edit profile photo"
            >
              <Text variant="caption" style={{ color: colors.primary }}>Edit photo</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/edit-profile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <View style={styles.labelValue}>
              <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
                Name
              </Text>
              <Text variant="body" style={{ color: colors.text }}>
                {displayName}
              </Text>
            </View>
            <Text variant="body" style={{ color: colors.primary }}>Edit</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.background }]} />

          <View style={styles.row}>
            <View style={styles.labelValue}>
              <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
                Email
              </Text>
              <Text variant="body" style={{ color: colors.text }} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {memberSince ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.background }]} />
              <View style={styles.row}>
                <View style={styles.labelValue}>
                  <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
                    Member since
                  </Text>
                  <Text variant="body" style={{ color: colors.text }}>
                    {memberSince}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  settingsButton: {
    padding: spacing.sm,
    marginRight: -spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  editPhotoLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
  },
  row: {
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelValue: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  label: { marginBottom: 0 },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
});
