import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useConvexAuth } from 'convex/react';
import { authClient } from './lib/auth-client';
import { useTheme } from './lib/theme-context';
import { spacing } from './lib/theme';
import { Card, Button, Input, Text, ThemeToggle } from './components';

function SignInSignUp() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) throw new Error(result.error.message);
      } else {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (result.error) throw new Error(result.error.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Text variant="cardTitle">{mode === 'signin' ? 'Sign in' : 'Sign up'}</Text>
        {mode === 'signup' && (
          <Input
            placeholder="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />
        )}
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        {error ? <Text variant="error">{error}</Text> : null}
        <Button loading={loading} onPress={handleSubmit}>
          {mode === 'signin' ? 'Sign in' : 'Sign up'}
        </Button>
        <Button
          variant="link"
          onPress={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setError(null);
          }}
          disabled={loading}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Button>
      </KeyboardAvoidingView>
    </Card>
  );
}

function AuthenticatedContent() {
  const { data: session } = authClient.useSession();
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => authClient.signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Permanently delete your account and all data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const result = await authClient.deleteUser();
              if (result?.error) throw new Error(result.error.message);
            } catch (e) {
              Alert.alert(
                'Error',
                e instanceof Error ? e.message : 'Could not delete account. Try signing in again and delete within 24 hours, or use password if you have one.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Card>
      <Text variant="bodySmall" style={styles.cardBody}>
        Hello, {session?.user?.name ?? session?.user?.email ?? 'there'}!
      </Text>
      <Button onPress={() => setCount((c) => c + 1)}>Count: {count}</Button>
      <Button variant="link" onPress={handleSignOut} disabled={deleting}>
        Sign out
      </Button>
      <Button
        variant="danger"
        style={styles.linkSpacing}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        Delete account
      </Button>
    </Card>
  );
}

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { colors, resolvedScheme } = useTheme();

  return (
    <View style={[styles.app, { backgroundColor: colors.background }]}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text variant="title">ndnd</Text>
        <Text variant="subtitle">React Native · Expo · Auth</Text>
        <ThemeToggle />
      </View>
      {isLoading ? (
        <Card>
          <ActivityIndicator size="large" color={colors.muted} />
          <Text variant="bodySmall" style={styles.loadingText}>
            Loading…
          </Text>
        </Card>
      ) : isAuthenticated ? (
        <AuthenticatedContent />
      ) : (
        <SignInSignUp />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.lg,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  cardBody: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  linkSpacing: {
    marginTop: spacing.sm,
  },
  loadingText: {
    marginTop: spacing.lg,
  },
});
