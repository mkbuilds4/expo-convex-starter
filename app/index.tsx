import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvexAuth } from 'convex/react';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';
import { Text } from '../components';

export default function Index() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router reference can change and cause redirect loops on device
  }, [isAuthenticated, isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.muted} />
      <Text variant="bodySmall" style={styles.text}>
        Loading…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  text: {
    marginTop: spacing.lg,
  },
});
