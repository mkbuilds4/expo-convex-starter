import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
  useColorScheme,
  Switch,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authClient } from '../../lib/auth-client';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { useRouter } from 'expo-router';
import { Button, Text, ThemeToggle, BottomSheetModal } from '../../components';
import Toast from 'react-native-toast-message';

const PUSH_NOTIFICATIONS_KEY = '@expo-convex-starter/push-notifications';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, preference } = useTheme();
  const colorScheme = useColorScheme();
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PUSH_NOTIFICATIONS_KEY).then((stored) => {
      if (stored !== null) setPushEnabled(stored === 'true');
    });
  }, []);

  const setPushEnabledAndStore = (value: boolean) => {
    setPushEnabled(value);
    AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, value ? 'true' : 'false');
  };

  const openLink = (url: string | undefined, label: string) => {
    if (url) Linking.openURL(url);
    else Toast.show({ type: 'info', text1: `Add EXPO_PUBLIC_${label} to .env to link here` });
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => authClient.signOut() },
    ]);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const result = await authClient.deleteUser();
      if (result?.error) throw new Error(result.error.message);
      setDeleteSheetOpen(false);
      Toast.show({ type: 'success', text1: 'Account deleted' });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not delete account. Try signing in again.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const themeLabel =
    preference === 'system'
      ? `System (${colorScheme === 'dark' ? 'Dark' : 'Light'})`
      : preference === 'dark'
        ? 'Dark'
        : 'Light';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="title">Settings</Text>
        <Text variant="subtitle">Preferences and account</Text>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
          Appearance
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text variant="body" style={{ color: colors.text }}>
                Theme
              </Text>
              <Text variant="caption" style={[styles.rowCaption, { color: colors.muted }]}>
                {themeLabel}
              </Text>
            </View>
            <ThemeToggle />
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
          Notifications
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text variant="body" style={{ color: colors.text }}>
                Push notifications
              </Text>
              <Text variant="caption" style={[styles.rowCaption, { color: colors.muted }]}>
                Reminders and updates
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabledAndStore}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
          About
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Text variant="body" style={{ color: colors.text }}>
              Version
            </Text>
            <Text variant="caption" style={{ color: colors.muted }}>
              {appVersion}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.background }]} />
          <Pressable
            style={({ pressed }) => [styles.accountRow, pressed && { opacity: 0.8 }]}
            onPress={() => openLink(process.env.EXPO_PUBLIC_TERMS_URL, 'TERMS_URL')}
            accessibilityRole="button"
            accessibilityLabel="Terms of Service"
          >
            <Text variant="body" style={{ color: colors.text }}>
              Terms of Service
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.background }]} />
          <Pressable
            style={({ pressed }) => [styles.accountRow, pressed && { opacity: 0.8 }]}
            onPress={() => openLink(process.env.EXPO_PUBLIC_PRIVACY_URL, 'PRIVACY_URL')}
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
          >
            <Text variant="body" style={{ color: colors.text }}>
              Privacy Policy
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
          Account
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable
            style={({ pressed }) => [
              styles.accountRow,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.push('/change-password')}
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            <Text variant="body" style={{ color: colors.text }}>
              Change password
            </Text>
            <Text variant="caption" style={{ color: colors.muted }}>
              Update your password
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.background }]} />

          <Pressable
            style={({ pressed }) => [
              styles.accountRow,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text variant="body" style={{ color: colors.text }}>
              Sign out
            </Text>
            <Text variant="caption" style={{ color: colors.muted }}>
              Sign out of this device
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.background }]} />

          <Pressable
            style={({ pressed }) => [
              styles.dangerRow,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setDeleteSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityHint="Opens confirmation to permanently delete your account"
          >
            <View style={styles.dangerTextBlock}>
              <Text variant="body" style={{ color: colors.error }}>
                Delete account
              </Text>
              <Text variant="caption" style={[styles.dangerCaption, { color: colors.muted }]}>
                Permanently remove your account and data
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <BottomSheetModal
        isOpen={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text variant="cardTitle" style={styles.sheetTitle}>
            Delete account?
          </Text>
          <Text variant="body" style={styles.sheetBody}>
            Permanently delete your account and all data. This cannot be undone.
          </Text>
          <Button
            variant="danger"
            onPress={handleDeleteAccount}
            loading={deleting}
            disabled={deleting}
            style={[styles.sheetButton, styles.sheetDangerButton, { backgroundColor: colors.error }]}
            textStyle={styles.sheetDangerButtonText}
          >
            Delete my account
          </Button>
          <Button
            variant="link"
            onPress={() => setDeleteSheetOpen(false)}
            disabled={deleting}
            textStyle={[styles.sheetCancelText, { color: colors.muted }]}
            style={styles.sheetCancelButton}
          >
            Cancel
          </Button>
        </View>
      </BottomSheetModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
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
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  rowLabel: {
    flex: 1,
    gap: spacing.xs,
  },
  rowCaption: {
    marginTop: 2,
  },
  accountRow: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },
  dangerRow: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  dangerTextBlock: {
    gap: spacing.xs,
  },
  dangerCaption: {
    marginTop: 2,
  },
  sheetContent: {
    padding: spacing.xl,
  },
  sheetTitle: {
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: 22,
  },
  sheetBody: {
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  sheetButton: {
    marginBottom: spacing.sm,
  },
  sheetDangerButton: {
    paddingVertical: 16,
    borderRadius: radii.md,
    minHeight: 52,
  },
  sheetDangerButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  sheetCancelButton: {
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  sheetCancelText: {
    fontSize: 17,
    fontWeight: '500',
  },
});
