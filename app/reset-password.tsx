import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';
import { Card, Text } from '../components';

/**
 * Example deep link route for password reset.
 * Link to: expostarter://reset-password?token=YOUR_RESET_TOKEN
 * (Replace expostarter with your app scheme from app.json.)
 */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Card style={styles.card}>
        <Text variant="cardTitle" style={styles.title}>
          Reset password
        </Text>
        <Text variant="bodySmall" style={styles.body}>
          {token
            ? `Token received. Wire this screen to your auth provider's reset API (e.g. Better Auth reset flow). Token: ${token.slice(0, 12)}…`
            : 'No token in URL. Open via expostarter://reset-password?token=...'}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  card: { alignItems: 'stretch' },
  title: { marginBottom: spacing.md },
  body: { marginBottom: 0 },
});
