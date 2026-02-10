import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';
import { BackHeader, Button, Input, Text } from '../components';
import { authClient } from '../lib/auth-client';
import Toast from 'react-native-toast-message';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { data: session } = authClient.useSession();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const canSubmit = name.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result?.error) throw new Error(result.error.message);
      Toast.show({ type: 'success', text1: 'Profile updated' });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          title="Edit profile"
          subtitle="Update your display name."
          onBack={() => router.back()}
          disabled={loading}
        />

        <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
          Name
        </Text>
        <Input
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          accessibilityLabel="Display name"
        />

        {error ? (
          <Text variant="error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
          style={styles.submit}
        >
          Save changes
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  label: { marginBottom: spacing.xs },
  error: { marginBottom: spacing.md },
  submit: { marginTop: spacing.sm },
});
