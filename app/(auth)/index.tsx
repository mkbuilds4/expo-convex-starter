import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing } from '../../lib/theme';
import { Button, Text } from '../../components';

export default function AuthLanding() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text variant="cardTitle" style={styles.title}>
          Welcome
        </Text>
        <Text variant="body" style={styles.body}>
          Sign in to continue to your account, or create a new one to get started.
        </Text>
      </View>
      <View style={styles.buttons}>
        <Button
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityLabel="Log in"
          accessibilityHint="Open sign in screen"
        >
          Log in
        </Button>
        <Button
          variant="secondary"
          onPress={() => router.push('/(auth)/sign-up')}
          accessibilityLabel="Create account"
          accessibilityHint="Open sign up screen"
        >
          Create account
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  top: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
  },
  title: { marginBottom: spacing.md },
  body: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  buttons: {
    width: '100%',
    minHeight: 168,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
