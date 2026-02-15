import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authClient } from '../../lib/auth-client';
import { useTheme } from '../../lib/theme-context';
import { spacing } from '../../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerHeaderRow,
  ledgerSection,
  ledgerRow,
} from '../../lib/ledger-theme';
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
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <View style={[ledgerHeaderRow, { alignItems: 'center' }]}>
            <View>
              <Text style={[ledgerText(), { fontSize: 16, letterSpacing: 1 }]}>PROFILE</Text>
              <Text style={[ledgerDim(), { fontSize: 12, marginTop: 2 }]}>Your account info</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="settings-outline" size={22} color="#7F1D1D" />
            </Pressable>
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>ACCOUNT</Text>
          <View style={ledgerLine} />
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: '#B91C1C' }]}>
              <Text style={[ledgerText(), { fontSize: 28, color: '#fff' }]}>{initial}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text style={ledgerText({ fontSize: 12 })}>EDIT PHOTO</Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/edit-profile')}
          >
            <View>
              <Text style={[ledgerDim(), { fontSize: 11 }]}>Name</Text>
              <Text style={[ledgerText(), { fontSize: 14 }]}>{displayName}</Text>
            </View>
            <Text style={ledgerText({ fontSize: 12 })}>EDIT</Text>
          </Pressable>
          <View style={ledgerRow}>
            <View>
              <Text style={[ledgerDim(), { fontSize: 11 }]}>Email</Text>
              <Text style={[ledgerText(), { fontSize: 14 }]} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>
          {memberSince && (
            <View style={ledgerRow}>
              <View>
                <Text style={[ledgerDim(), { fontSize: 11 }]}>Member since</Text>
                <Text style={[ledgerText(), { fontSize: 14 }]}>{memberSince}</Text>
              </View>
            </View>
          )}
          <View style={ledgerLine} />
        </View>

        <View style={{ height: insets.bottom + spacing.xxl * 2 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  settingsBtn: { padding: spacing.sm },
  avatarRow: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
