import type { ReactNode } from 'react';
import { useMemo } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing, radii, typography } from '../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'link' | 'danger';

type ButtonProps = PressableProps & {
  variant?: ButtonVariant;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  loading = false,
  style,
  textStyle,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
        },
        primary: {
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: spacing.xl,
          borderRadius: radii.md,
          width: '100%',
        },
        primaryText: {
          ...typography.button,
          color: colors.onPrimary,
        },
        secondary: {
          backgroundColor: colors.background,
          paddingVertical: 14,
          paddingHorizontal: spacing.xl,
          borderRadius: radii.md,
          width: '100%',
          borderWidth: 1,
          borderColor: colors.primary,
        },
        secondaryText: {
          ...typography.button,
          color: colors.primary,
        },
        link: {
          paddingVertical: spacing.sm,
          marginTop: spacing.lg,
        },
        linkText: {
          ...typography.caption,
          color: colors.muted,
        },
        dangerText: {
          ...typography.caption,
          color: colors.error,
        },
        disabled: { opacity: 0.7 },
        pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
      }),
    [colors.primary, colors.onPrimary, colors.background, colors.text, colors.muted, colors.error]
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true || loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'link' && styles.link,
        variant === 'danger' && styles.link,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.onPrimary : variant === 'secondary' ? colors.primary : colors.muted}
          size="small"
        />
      ) : (
        <Text
          style={[
            variant === 'primary' && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            variant === 'link' && styles.linkText,
            variant === 'danger' && styles.dangerText,
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
