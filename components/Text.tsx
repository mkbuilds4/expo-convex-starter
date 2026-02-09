import { useMemo } from 'react';
import { Text as RNText, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { typography, spacing } from '../lib/theme';

type TextVariant = 'title' | 'subtitle' | 'cardTitle' | 'body' | 'bodySmall' | 'caption' | 'error' | 'link';

type ThemedTextProps = TextProps & {
  variant?: TextVariant;
  style?: TextStyle;
};

export function Text({ variant = 'body', style, ...rest }: ThemedTextProps) {
  const { colors } = useTheme();
  const variantStyles = useMemo(
    () =>
      StyleSheet.create<Record<TextVariant, TextStyle>>({
        title: {
          ...typography.title,
          color: colors.text,
          marginBottom: spacing.xs,
        },
        subtitle: {
          ...typography.body,
          color: colors.muted,
        },
        cardTitle: {
          ...typography.cardTitle,
          color: colors.text,
          marginBottom: spacing.lg,
        },
        body: {
          ...typography.body,
          color: colors.text,
        },
        bodySmall: {
          ...typography.bodySmall,
          color: colors.muted,
        },
        caption: {
          ...typography.caption,
          color: colors.muted,
        },
        error: {
          ...typography.caption,
          color: colors.error,
          marginBottom: spacing.sm,
          width: '100%',
        },
        link: {
          ...typography.caption,
          color: colors.muted,
        },
      }),
    [colors.text, colors.muted, colors.error]
  );
  return <RNText style={[variantStyles[variant], style]} {...rest} />;
}
