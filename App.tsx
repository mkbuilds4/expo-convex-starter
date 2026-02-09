import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useConvexAuth } from 'convex/react';
import { authClient } from './lib/auth-client';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.authCard}
    >
      <Text style={styles.authTitle}>{mode === 'signin' ? 'Sign in' : 'Sign up'}</Text>
      {mode === 'signup' && (
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          (loading || pressed) && (loading ? styles.buttonDisabled : styles.buttonPressed),
        ]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#f8fafc" />
        ) : (
          <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign in' : 'Sign up'}</Text>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.linkButton, pressed && styles.buttonPressed]}
        onPress={() => {
          setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
          setError(null);
        }}
        disabled={loading}
      >
        <Text style={styles.linkText}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
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
    <View style={styles.card}>
      <Text style={styles.cardText}>
        Hello, {session?.user?.name ?? session?.user?.email ?? 'there'}!
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => setCount((c) => c + 1)}
      >
        <Text style={styles.buttonText}>Count: {count}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.linkButton, styles.signOut, pressed && styles.buttonPressed]}
        onPress={handleSignOut}
        disabled={deleting}
      >
        <Text style={styles.linkText}>Sign out</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.linkButton, styles.deleteAccount, pressed && styles.buttonPressed]}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        <Text style={styles.deleteAccountText}>Delete account</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <View style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>ndnd</Text>
        <Text style={styles.subtitle}>React Native · Expo · Auth</Text>
      </View>
      {isLoading ? (
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#94a3b8" />
          <Text style={[styles.cardText, { marginTop: 16 }]}>Loading…</Text>
        </View>
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
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 8,
    width: '100%',
  },
  cardText: {
    fontSize: 15,
    color: '#cbd5e1',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f8fafc',
  },
  linkButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  signOut: {
    marginTop: 8,
  },
  deleteAccount: {
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  deleteAccountText: {
    fontSize: 14,
    color: '#f87171',
  },
});
