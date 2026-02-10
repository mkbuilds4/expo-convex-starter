import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';
import { Button, Input, Text, BackHeader } from '../components';
import { authClient } from '../lib/auth-client';
import Toast from 'react-native-toast-message';

const MIN_LENGTH = 8;

function getPasswordStrength(password: string): 'weak' | 'okay' | 'strong' {
  if (!password) return 'weak';
  let score = 0;
  if (password.length >= MIN_LENGTH) score++;
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
    password.length >= MIN_LENGTH && /\d/.test(password) && /[A-Z]/.test(password)
  );
}

function getPasswordRequirementStatus(password: string) {
  return {
    minLength: password.length >= MIN_LENGTH,
    hasNumber: /\d/.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };
}

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newReq = getPasswordRequirementStatus(newPassword);
  const newStrength = getPasswordStrength(newPassword);
  const newPasswordValid = passwordMeetsRequirements(newPassword);
  const confirmMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const confirmMismatch = confirmTouched && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPasswordValid &&
    confirmMatch &&
    !confirmMismatch &&
    !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (result?.error) throw new Error(result.error.message);
      Toast.show({ type: 'success', text1: 'Password updated' });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password.');
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
          title="Change password"
          subtitle="Enter your current password and choose a new one."
          onBack={() => router.back()}
          disabled={loading}
        />

        <View style={styles.passwordInputWrap}>
          <Input
            placeholder="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={styles.passwordInputWithToggle}
            accessibilityLabel="Current password"
          />
          <Pressable
            onPress={() => setShowCurrent((v) => !v)}
            style={styles.showPasswordToggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showCurrent ? 'Hide password' : 'Show password'}
          >
            <Text variant="caption" style={styles.showPasswordLabel}>
              {showCurrent ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.passwordInputWrap}>
          <Input
            placeholder="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={styles.passwordInputWithToggle}
            accessibilityLabel="New password"
          />
          <Pressable
            onPress={() => setShowNew((v) => !v)}
            style={styles.showPasswordToggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showNew ? 'Hide new password' : 'Show new password'}
          >
            <Text variant="caption" style={styles.showPasswordLabel}>
              {showNew ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.requirementsBlock}>
          <Text
            variant="caption"
            style={[
              styles.requirementLine,
              newReq.minLength ? { color: colors.primary } : { color: colors.muted },
            ]}
          >
            {newReq.minLength ? '✓' : '○'} At least {MIN_LENGTH} characters
          </Text>
          <Text
            variant="caption"
            style={[
              styles.requirementLine,
              newReq.hasNumber ? { color: colors.primary } : { color: colors.muted },
            ]}
          >
            {newReq.hasNumber ? '✓' : '○'} Include a number
          </Text>
          <Text
            variant="caption"
            style={[
              styles.requirementLine,
              newReq.hasUppercase ? { color: colors.primary } : { color: colors.muted },
            ]}
          >
            {newReq.hasUppercase ? '✓' : '○'} Include an uppercase letter
          </Text>
          <Text
            variant="caption"
            style={[
              styles.strengthLabel,
              {
                color:
                  newStrength === 'strong'
                    ? colors.primary
                    : newStrength === 'okay'
                      ? colors.text
                      : colors.muted,
              },
            ]}
          >
            Strength: {newStrength.charAt(0).toUpperCase() + newStrength.slice(1)}
          </Text>
        </View>

        <View style={styles.passwordInputWrap}>
          <Input
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => setConfirmTouched(true)}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={styles.passwordInputWithToggle}
            accessibilityLabel="Confirm new password"
          />
          <Pressable
            onPress={() => setShowConfirm((v) => !v)}
            style={styles.showPasswordToggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          >
            <Text variant="caption" style={styles.showPasswordLabel}>
              {showConfirm ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </View>

        {confirmMismatch ? (
          <Text variant="error" style={styles.confirmMismatch}>
            Passwords do not match.
          </Text>
        ) : null}

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
          Update password
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
  confirmMismatch: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  error: { marginBottom: spacing.md },
  submit: { marginTop: spacing.sm },
});
