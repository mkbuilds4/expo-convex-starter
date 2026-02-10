import { View, StyleSheet } from 'react-native';
import { authClient } from '../../lib/auth-client';
import { useTheme } from '../../lib/theme-context';
import { spacing } from '../../lib/theme';
import { Card, Text } from '../../components';

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="title">Profile</Text>
        <Text variant="subtitle">Your account info</Text>
      </View>
      <Card style={styles.card}>
        <Text variant="caption" style={styles.label}>
          Name
        </Text>
        <Text variant="body" style={styles.value}>
          {session?.user?.name ?? '—'}
        </Text>
        <Text variant="caption" style={styles.label}>
          Email
        </Text>
        <Text variant="body" style={styles.value}>
          {session?.user?.email ?? '—'}
        </Text>
      </Card>
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
  },
  label: { marginTop: spacing.sm, marginBottom: spacing.xs },
  value: { marginBottom: spacing.md },
});
