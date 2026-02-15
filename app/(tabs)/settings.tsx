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
import { useHideAmounts } from '../../lib/hide-amounts-context';
import { spacing, radii } from '../../lib/theme';
import { useRouter } from 'expo-router';
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
import { Ionicons } from '@expo/vector-icons';
import { Button, Text, ThemeToggle, BottomSheetModal } from '../../components';
import Toast from 'react-native-toast-message';

const PUSH_NOTIFICATIONS_KEY = '@expo-convex-starter/push-notifications';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, preference } = useTheme();
  const colorScheme = useColorScheme();
  const { hideAmounts, setHideAmounts } = useHideAmounts();
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
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <View style={ledgerHeaderRow}>
            <View>
              <Text style={[ledgerText(), { fontSize: 16, letterSpacing: 1 }]}>SETTINGS</Text>
              <Text style={[ledgerDim(), { fontSize: 12, marginTop: 2 }]}>
                Preferences and account
              </Text>
            </View>
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>APPEARANCE</Text>
          <View style={ledgerLine} />
          <View style={[ledgerRow, { paddingVertical: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[ledgerText(), { fontSize: 14 }]}>Theme</Text>
              <Text style={[ledgerDim(), { fontSize: 11, marginTop: 2 }]}>{themeLabel}</Text>
            </View>
            <ThemeToggle />
          </View>
          <View style={[ledgerRow, { paddingVertical: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[ledgerText(), { fontSize: 14 }]}>Hide amounts</Text>
              <Text style={[ledgerDim(), { fontSize: 11, marginTop: 2 }]}>Mask account balances and other sensitive amounts</Text>
            </View>
            <Switch
              value={hideAmounts}
              onValueChange={setHideAmounts}
              trackColor={{ false: '#1a0a0a', true: '#B91C1C' }}
              thumbColor="#fff"
            />
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>NOTIFICATIONS</Text>
          <View style={ledgerLine} />
          <View style={[ledgerRow, { paddingVertical: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[ledgerText(), { fontSize: 14 }]}>Push notifications</Text>
              <Text style={[ledgerDim(), { fontSize: 11, marginTop: 2 }]}>Reminders and updates</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabledAndStore}
              trackColor={{ false: '#1a0a0a', true: '#B91C1C' }}
              thumbColor="#fff"
            />
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>ABOUT</Text>
          <View style={ledgerLine} />
          <View style={[ledgerRow, { paddingVertical: spacing.md }]}>
            <Text style={[ledgerText(), { fontSize: 14 }]}>Version</Text>
            <Text style={ledgerDim({ fontSize: 14 })}>{appVersion}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
            onPress={() => openLink(process.env.EXPO_PUBLIC_TERMS_URL, 'TERMS_URL')}
          >
            <Text style={[ledgerText(), { fontSize: 14 }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F1D1D" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
            onPress={() => openLink(process.env.EXPO_PUBLIC_PRIVACY_URL, 'PRIVACY_URL')}
          >
            <Text style={[ledgerText(), { fontSize: 14 }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F1D1D" />
          </Pressable>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>ACCOUNT</Text>
          <View style={ledgerLine} />
          <Pressable
            style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/change-password')}
          >
            <Text style={[ledgerText(), { fontSize: 14 }]}>Change password</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F1D1D" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
            onPress={handleSignOut}
          >
            <Text style={[ledgerText(), { fontSize: 14 }]}>Sign out</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F1D1D" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
            onPress={() => setDeleteSheetOpen(true)}
          >
            <Text style={[ledgerText(), { fontSize: 14, color: '#DC2626' }]}>Delete account</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F1D1D" />
          </Pressable>
          <View style={ledgerLine} />
        </View>

        <View style={{ height: insets.bottom + spacing.xxl * 2 }} />
      </ScrollView>

      <BottomSheetModal
        isOpen={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text variant="cardTitle" style={[styles.sheetTitle, { color: colors.text }]}>
            Delete account?
          </Text>
          <Text variant="body" style={[styles.sheetBody, { color: colors.muted }]}>
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
