import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { authClient } from '../../lib/auth-client';
import { useTheme } from '../../lib/theme-context';
import { spacing } from '../../lib/theme';
import { Button, Card, Text, ThemeToggle, BottomSheetModal } from '../../components';
import Toast from 'react-native-toast-message';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="title">Settings</Text>
        <Text variant="subtitle">Appearance and account</Text>
      </View>
      <Card style={styles.card}>
        <Text variant="cardTitle" style={styles.sectionTitle}>
          Appearance
        </Text>
        <ThemeToggle />
      </Card>
      <Card style={styles.card}>
        <Text variant="cardTitle" style={styles.sectionTitle}>
          Account
        </Text>
        <Button variant="secondary" onPress={handleSignOut}>
          Sign out
        </Button>
        <Button
          variant="danger"
          onPress={() => setDeleteSheetOpen(true)}
          style={styles.deleteButton}
        >
          Delete account
        </Button>
      </Card>
      <BottomSheetModal
        isOpen={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text variant="cardTitle" style={styles.sheetTitle}>
            Delete account?
          </Text>
          <Text variant="bodySmall" style={styles.sheetBody}>
            Permanently delete your account and all data. This cannot be undone.
          </Text>
          <Button
            variant="danger"
            onPress={handleDeleteAccount}
            loading={deleting}
            disabled={deleting}
            style={styles.sheetButton}
          >
            Delete my account
          </Button>
          <Button variant="link" onPress={() => setDeleteSheetOpen(false)} disabled={deleting}>
            Cancel
          </Button>
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    alignItems: 'stretch',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: { marginBottom: spacing.md },
  deleteButton: { marginTop: spacing.sm },
  sheetContent: { padding: spacing.xl },
  sheetTitle: { marginBottom: spacing.md, textAlign: 'center' },
  sheetBody: { marginBottom: spacing.xl, textAlign: 'center' },
  sheetButton: { marginBottom: spacing.sm },
});
