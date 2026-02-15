import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing, radii } from '../lib/theme';
import { formatCurrency } from '../lib/format';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';

export type DebtCardProps = {
  name: string;
  balance: number;
  type: 'credit' | 'loan';
  subtype?: string;
  interestRate?: number;
  minimumPayment?: number;
  onPress?: () => void;
};

export function DebtCard({
  name,
  balance,
  type,
  interestRate,
  minimumPayment,
  onPress,
}: DebtCardProps) {
  const { colors } = useTheme();
  const isCredit = type === 'credit';
  const metaphorLabel = isCredit ? 'Boxes in the house' : 'Locked wing';
  const hint = isCredit
    ? 'Each payment removes clutter and frees space'
    : 'Each payment unlocks more of your house';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.error + '40',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.error + '20' }]}>
          <Ionicons
            name={isCredit ? 'cube' : 'lock-closed'}
            size={22}
            color={colors.error}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text variant="caption" style={[styles.metaphorLabel, { color: colors.muted }]}>
            {metaphorLabel}
          </Text>
          <Text variant="body" style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Text variant="body" style={{ color: colors.error, fontWeight: '600' }}>
          {formatCurrency(balance)}
        </Text>
      </View>
      {(interestRate != null || minimumPayment != null) && (
        <View style={styles.meta}>
          {interestRate != null && (
            <Text variant="caption" style={{ color: colors.muted }}>
              {(interestRate * 100).toFixed(1)}% APR
            </Text>
          )}
          {interestRate != null && minimumPayment != null && (
            <Text variant="caption" style={{ color: colors.muted }}> · </Text>
          )}
          {minimumPayment != null && (
            <Text variant="caption" style={{ color: colors.muted }}>
              Min {formatCurrency(minimumPayment)}/mo
            </Text>
          )}
        </View>
      )}
      <Text variant="caption" style={[styles.hint, { color: colors.muted }]}>
        {hint}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, minWidth: 0 },
  metaphorLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  hint: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
