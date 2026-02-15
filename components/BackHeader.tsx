import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';
import { useLedgerAccent } from '../lib/financial-state-context';
import { Text } from './Text';

type BackHeaderProps = {
  title: string;
  onBack: () => void;
  subtitle?: string;
  disabled?: boolean;
  variant?: 'default' | 'ledger';
};

export function BackHeader({ title, onBack, subtitle, disabled, variant = 'default' }: BackHeaderProps) {
  const { colors } = useTheme();
  const { accent, accentDim } = useLedgerAccent();
  const isLedger = variant === 'ledger';
  const arrowColor = isLedger ? accentDim : colors.muted;
  const titleColor = isLedger ? accent : colors.text;
  const subtitleColor = isLedger ? accentDim : colors.muted;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack}
          disabled={disabled}
          style={({ pressed }) => [
            styles.backTouchable,
            pressed && !disabled && styles.backTouchablePressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text variant="caption" style={[styles.backArrow, { color: arrowColor }]}>
            ←
          </Text>
        </Pressable>
        <Text variant="cardTitle" style={[styles.title, { color: titleColor }]}>
          {title}
        </Text>
        <View style={styles.spacer} />
      </View>
      {subtitle ? (
        <Text variant="subtitle" style={[styles.subtitle, { color: subtitleColor }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    marginBottom: 0,
  },
  spacer: {
    width: 32,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: 0,
  },
});
