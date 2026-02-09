import { useMemo } from 'react';
import { View, type ViewProps, type ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing, radii, layout } from '../lib/theme';

type CardProps = ViewProps & {
  style?: ViewStyle;
  compact?: boolean;
};

export function Card({ children, style, compact, ...rest }: CardProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.xl,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignItems: 'center',
        },
        compact: {
          padding: spacing.lg,
        },
      }),
    [colors.surface]
  );
  return (
    <View style={[styles.card, compact && styles.compact, style]} {...rest}>
      {children}
    </View>
  );
}
