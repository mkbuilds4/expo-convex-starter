import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { formatCurrency } from '../../lib/format';
import { Text, Button, DebtCard } from '../../components';
import Toast from 'react-native-toast-message';

export default function NetWorthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const summary = useQuery(api.networth.getSummary);
  const snapshots = useQuery(api.networth.getSnapshotHistory, { limit: 14 });
  const saveSnapshot = useMutation(api.networth.saveSnapshot);

  const [saving, setSaving] = useState(false);

  const totalAssets = summary?.totalAssets ?? 0;
  const totalLiabilities = summary?.totalLiabilities ?? 0;
  const netWorth = summary?.netWorth ?? 0;
  const assetAccounts = summary?.assetAccounts ?? [];
  const debtAccounts = summary?.debtAccounts ?? [];

  const handleSaveSnapshot = async () => {
    setSaving(true);
    try {
      await saveSnapshot();
      Toast.show({ type: 'success', text1: 'Snapshot saved' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="title">Net Worth</Text>
        <Text variant="subtitle">Assets minus liabilities</Text>
      </View>

      {/* Net worth card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <Text variant="caption" style={[styles.summaryLabel, { color: colors.muted }]}>
          Net worth
        </Text>
        <Text
          variant="cardTitle"
          style={[
            styles.netWorthAmount,
            { color: netWorth >= 0 ? colors.primary : colors.error },
          ]}
        >
          {formatCurrency(netWorth)}
        </Text>
        <View style={styles.breakdown}>
          <Text variant="caption" style={{ color: colors.primary }}>
            Assets {formatCurrency(totalAssets)}
          </Text>
          <Text variant="caption" style={{ color: colors.muted }}>−</Text>
          <Text variant="caption" style={{ color: colors.error }}>
            Clutter & locked doors {formatCurrency(totalLiabilities)}
          </Text>
        </View>
        <Button
          variant="secondary"
          onPress={handleSaveSnapshot}
          loading={saving}
          disabled={saving}
          style={styles.snapshotBtn}
        >
          Record snapshot
        </Button>
      </View>

      {/* Assets */}
      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
          Assets
        </Text>
        {assetAccounts.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" style={{ color: colors.muted }}>
              No asset accounts. Add checking, savings, or investment accounts.
            </Text>
            <Button onPress={() => router.push('/(tabs)/accounts')} style={styles.topMargin}>
              Add account
            </Button>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {assetAccounts.map((acc) => (
              <Pressable
                key={acc._id}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
                onPress={() => router.push('/(tabs)/accounts')}
              >
                <Text variant="body" style={{ color: colors.text }}>{acc.name}</Text>
                <Text variant="body" style={{ color: colors.primary }}>
                  {formatCurrency(acc.currentBalance)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* What's blocking your house — debt as clutter / locked doors */}
      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
          What's blocking your house
        </Text>
        {debtAccounts.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" style={{ color: colors.muted }}>
              No clutter or locked wings. Add credit cards or loans to track — they'll show as boxes in the house or locked wings.
            </Text>
            <Button onPress={() => router.push('/(tabs)/accounts')} style={styles.topMargin}>
              Add account
            </Button>
          </View>
        ) : (
          <>
            {debtAccounts.map((acc) => (
              <DebtCard
                key={acc._id}
                name={acc.name}
                balance={acc.currentBalance}
                type={acc.type === 'credit' ? 'credit' : 'loan'}
                subtype={acc.subtype}
                interestRate={acc.interestRate ?? undefined}
                minimumPayment={acc.minimumPayment ?? undefined}
                onPress={() => router.push('/(tabs)/accounts')}
              />
            ))}
          </>
        )}
      </View>

      {/* Snapshot history */}
      {snapshots && snapshots.length > 0 && (
        <View style={styles.section}>
          <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
            History
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {snapshots.map((s) => (
              <View key={s._id} style={styles.historyRow}>
                <Text variant="caption" style={{ color: colors.muted }}>{s.date}</Text>
                <Text
                  variant="body"
                  style={{ color: s.netWorth >= 0 ? colors.primary : colors.error }}
                >
                  {formatCurrency(s.netWorth)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: insets.bottom + spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.lg,
  },
  summaryLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  netWorthAmount: { fontSize: 32, marginVertical: spacing.sm },
  breakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  snapshotBtn: { alignSelf: 'flex-start' },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  topMargin: { marginTop: spacing.sm },
});
