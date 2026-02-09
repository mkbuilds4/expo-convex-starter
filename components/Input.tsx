import { useMemo } from 'react';
import {
  TextInput,
  type TextInputProps,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing, radii, typography } from '../lib/theme';

type InputProps = TextInputProps & {
  style?: ViewStyle;
};

export function Input({ style, ...rest }: InputProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        input: {
          width: '100%',
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          fontSize: typography.body.fontSize,
          color: colors.text,
          marginBottom: spacing.md,
        },
      }),
    [colors.surface, colors.text]
  );
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={colors.muted}
      {...rest}
    />
  );
}
