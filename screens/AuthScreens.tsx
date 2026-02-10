import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { authClient } from '../lib/auth-client';
import { spacing, radii } from '../lib/theme';
import { Button, Input, Text } from '../components';
import { useTheme } from '../lib/theme-context';

export type AuthScreen = 'landing' | 'signin' | 'signup';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

function getPasswordStrength(password: string): 'weak' | 'okay' | 'strong' {
  if (!password) return 'weak';
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/\d/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'okay';
  return 'strong';
}

function passwordMeetsRequirements(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /\d/.test(password) &&
    /[A-Z]/.test(password)
  );
}

function getPasswordRequirementStatus(password: string) {
  return {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    hasNumber: /\d/.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };
}

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('email') && (lower.includes('already') || lower.includes('exist') || lower.includes('registered')))
    return 'This email is already registered. Try logging in.';
  if (lower.includes('invalid') && lower.includes('email')) return 'Please enter a valid email address.';
  if (lower.includes('password') && (lower.includes('weak') || lower.includes('short')))
    return 'Password must be at least 8 characters and include a number and uppercase letter.';
  if (lower.includes('invalid') && lower.includes('credential'))
    return 'Invalid email or password. Please try again.';
  return message;
}

export function LandingScreen({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <View style={styles.authScreen}>
      <View style={styles.landingTop}>
        <Text variant="cardTitle" style={styles.landingTitle}>
          Welcome
        </Text>
        <Text variant="body" style={styles.landingBody}>
          Sign in to continue to your account, or create a new one to get started.
        </Text>
      </View>
      <View style={styles.landingButtons}>
        <Button onPress={onSignIn}>Log in</Button>
        <Button variant="secondary" onPress={onSignUp}>
          Create account
        </Button>
      </View>
    </View>
  );
}

export function SignInSignUp({
  mode,
  onBack,
  onSwitchMode,
}: {
  mode: 'signin' | 'signup';
  onBack: () => void;
  onSwitchMode: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const { colors } = useTheme();

  const passwordReq = mode === 'signup' ? getPasswordRequirementStatus(password) : null;
  const passwordStrong = mode === 'signup' ? getPasswordStrength(password) : null;
  const confirmMismatch = mode === 'signup' && confirmPasswordTouched && password !== confirmPassword;

  const signupValid =
    mode === 'signup' &&
    name.trim().length > 0 &&
    isValidEmail(email) &&
    passwordMeetsRequirements(password) &&
    password === confirmPassword &&
    termsAccepted;

  const signinValid = mode === 'signin' && email.trim().length > 0 && password.length > 0;
  const canSubmit = loading ? false : mode === 'signin' ? signinValid : signupValid;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (!passwordMeetsRequirements(password)) {
        setError('Password must be at least 8 characters and include a number and uppercase letter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!termsAccepted) {
        setError('Please accept the Terms of Service and Privacy Policy.');
        return;
      }
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
        Alert.alert('Account created', 'Welcome! You’re signed in.');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(formatAuthError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authScreen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <Pressable
              onPress={onBack}
              disabled={loading}
              style={({ pressed }) => [styles.backTouchable, pressed && styles.backTouchablePressed]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Returns to the previous screen"
            >
              <Text variant="caption" style={styles.backArrow}>
                ←
              </Text>
            </Pressable>
            <Text variant="cardTitle" style={styles.formTitle}>
              {mode === 'signin' ? 'Log in' : 'Create account'}
            </Text>
            <View style={styles.titleRowSpacer} />
          </View>
          <View style={styles.formContent}>
            {mode === 'signup' && (
              <Input
                placeholder="Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
                accessibilityLabel="Name"
                accessibilityHint="Enter your display name"
              />
            )}
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              accessibilityLabel="Email"
              accessibilityHint="Enter your email address"
            />
            <View style={styles.passwordInputWrap}>
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                style={styles.passwordInputWithToggle}
                accessibilityLabel="Password"
                accessibilityHint="Enter your password"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.showPasswordToggle}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Text variant="caption" style={styles.showPasswordLabel}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
            {mode === 'signup' && passwordReq && (
              <View style={styles.requirementsBlock}>
                <Text variant="caption" style={StyleSheet.flatten([styles.requirementLine, passwordReq.minLength ? { color: colors.primary } : undefined])}>
                  {passwordReq.minLength ? '✓' : '○'} At least {MIN_PASSWORD_LENGTH} characters
                </Text>
                <Text variant="caption" style={StyleSheet.flatten([styles.requirementLine, passwordReq.hasNumber ? { color: colors.primary } : undefined])}>
                  {passwordReq.hasNumber ? '✓' : '○'} Include a number
                </Text>
                <Text variant="caption" style={StyleSheet.flatten([styles.requirementLine, passwordReq.hasUppercase ? { color: colors.primary } : undefined])}>
                  {passwordReq.hasUppercase ? '✓' : '○'} Include an uppercase letter
                </Text>
                {passwordStrong && (
                  <Text
                    variant="caption"
                    style={StyleSheet.flatten([
                      styles.strengthLabel,
                      { color: passwordStrong === 'strong' ? colors.primary : passwordStrong === 'okay' ? colors.text : colors.muted },
                    ])}
                  >
                    Strength: {passwordStrong.charAt(0).toUpperCase() + passwordStrong.slice(1)}
                  </Text>
                )}
              </View>
            )}
            {mode === 'signin' && (
              <View style={styles.forgotPasswordRow}>
                <Button
                  variant="link"
                  onPress={() => {
                    // TODO: Implement forgot password flow (e.g. navigate to reset screen or trigger email)
                  }}
                  disabled={loading}
                  style={styles.forgotPasswordLink}
                  accessibilityLabel="Forgot password?"
                  accessibilityHint="Open password reset flow"
                >
                  Forgot password?
                </Button>
              </View>
            )}
            {mode === 'signup' && (
              <>
                <View style={styles.passwordInputWrap}>
                  <Input
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                    style={styles.passwordInputWithToggle}
                    accessibilityLabel="Confirm password"
                    accessibilityHint="Re-enter your password to confirm"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    style={styles.showPasswordToggle}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <Text variant="caption" style={styles.showPasswordLabel}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>
                {confirmMismatch && (
                  <Text variant="error" style={styles.confirmMismatchText}>
                    Passwords do not match.
                  </Text>
                )}
                <Pressable
                  style={styles.termsRow}
                  onPress={() => setTermsAccepted((a) => !a)}
                  disabled={loading}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: termsAccepted }}
                  accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: colors.muted, borderRadius: radii.sm },
                      termsAccepted ? { borderColor: colors.primary, backgroundColor: colors.primary } : undefined,
                    ]}
                  >
                    {termsAccepted ? <Text style={StyleSheet.flatten([styles.checkmark, { color: colors.onPrimary }])}>✓</Text> : null}
                  </View>
                  <Text variant="bodySmall" style={styles.termsText}>
                    I agree to the Terms of Service and Privacy Policy
                  </Text>
                </Pressable>
              </>
            )}
            {error ? (
              <View style={styles.errorBlock}>
                <Text variant="error">{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.formActions}>
          <Button
            loading={loading}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityLabel={mode === 'signin' ? 'Log in' : 'Create account'}
            accessibilityHint={mode === 'signin' ? 'Submit to sign in' : 'Submit to create your account'}
          >
            {mode === 'signin' ? 'Log in' : 'Create account'}
          </Button>
          <Button
            variant="link"
            onPress={() => {
              onSwitchMode();
              setError(null);
              setConfirmPassword('');
              setConfirmPasswordTouched(false);
              setTermsAccepted(false);
              // Email (and name, password) are intentionally kept when switching so that if
              // sign-up failed and the user goes to Log in then clicks "Create one", the
              // Create account form is pre-filled with the same email.
            }}
            disabled={loading}
            style={styles.switchModeLink}
            accessibilityLabel={mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
            accessibilityHint="Switch to the other form"
          >
            {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  landingTop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  landingTitle: {
    marginBottom: spacing.md,
  },
  landingBody: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  landingButtons: {
    width: '100%',
    minHeight: 168,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  formScroll: {
    flex: 1,
    width: '100%',
  },
  formScrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: 96,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.lg,
  },
  backTouchable: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minWidth: 32,
  },
  backTouchablePressed: {
    opacity: 0.7,
  },
  backArrow: {
    marginBottom: 0,
    fontSize: 22,
  },
  formTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    marginBottom: 0,
  },
  titleRowSpacer: {
    width: 32,
  },
  formContent: {
    width: '100%',
    alignItems: 'stretch',
  },
  errorBlock: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  formActions: {
    width: '100%',
    minHeight: 168,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  passwordInputWrap: {
    position: 'relative',
    width: '100%',
  },
  passwordInputWithToggle: {
    paddingRight: 56,
  },
  showPasswordToggle: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: spacing.md,
    justifyContent: 'center',
  },
  showPasswordLabel: {
    marginBottom: 0,
  },
  requirementsBlock: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  requirementLine: {
    marginBottom: 0,
  },
  strengthLabel: {
    marginTop: spacing.xs,
    marginBottom: 0,
  },
  confirmMismatchText: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '600',
  },
  termsText: {
    flex: 1,
    marginBottom: 0,
  },
  forgotPasswordRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 0,
    marginBottom: spacing.md,
  },
  forgotPasswordLink: {
    marginLeft: 0,
    marginTop: 0,
  },
  switchModeLink: {
    marginTop: spacing.md,
  },
});
