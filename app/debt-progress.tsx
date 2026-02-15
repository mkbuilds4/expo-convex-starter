import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { spacing } from '../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerSection,
  ledgerRow,
  ledgerEmpty,
} from '../lib/ledger-theme';
import { useLedgerAccent } from '../lib/financial-state-context';
import { formatCurrency } from '../lib/format';
import { Text, BackHeader } from '../components';

export default function DebtProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accent } = useLedgerAccent();
  const data = useQuery(api.debt.getDebtPayoffProjection);

  if (data === undefined) {
    return (
      <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
        <BackHeader title="Progress" onBack={() => router.back()} variant="ledger" />
        <View style={[ledgerSection, styles.centered]}>
          <Text style={ledgerDim({ fontSize: 14 })}>Loading…</Text>
        </View>
      </View>
    );
  }

  const hasDebt = data.totalDebtNow > 0;
  const progressPercent = Math.round(data.paidOffPercent);
  const monthsLeft = data.projection.monthsToPayoff;

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <BackHeader title="Progress" subtitle="Debt payoff & milestones" onBack={() => router.back()} variant="ledger" />
          <View style={ledgerLine} />
        </View>

        {!hasDebt ? (
          <View style={ledgerSection}>
            <View style={ledgerEmpty}>
              <Text style={ledgerText({ fontSize: 16 })}>No debt. You&apos;re clear.</Text>
            </View>
            <View style={ledgerLine} />
          </View>
        ) : (
          <>
            <View style={ledgerSection}>
              <Text style={[ledgerDim(), styles.sectionLabel]}>OVERVIEW</Text>
              <View style={ledgerLine} />
              <View style={ledgerRow}>
                <Text style={ledgerDim({ fontSize: 12 })}>Level</Text>
                <Text style={ledgerText({ fontSize: 14 })}>
                  {progressPercent >= 100 ? '5' : progressPercent >= 75 ? '4' : progressPercent >= 50 ? '3' : progressPercent >= 25 ? '2' : '1'}
                </Text>
              </View>
              <View style={ledgerRow}>
                <Text style={ledgerDim({ fontSize: 12 })}>Months to freedom</Text>
                <Text style={ledgerText({ fontSize: 14 })}>{monthsLeft}</Text>
              </View>
              <View style={ledgerRow}>
                <Text style={ledgerDim({ fontSize: 12 })}>Paid off so far</Text>
                <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(data.paidOffCents)}</Text>
              </View>
              <View style={[styles.progressTrack, { marginVertical: spacing.md }]}>
                <View style={[styles.progressFill, { width: `${Math.min(100, progressPercent)}%`, backgroundColor: accent }]} />
              </View>
              <Text style={[ledgerDim(), { fontSize: 11 }]}>{progressPercent}% of starting debt cleared</Text>
              <View style={ledgerLine} />
            </View>

            <View style={ledgerSection}>
              <Text style={[ledgerDim(), styles.sectionLabel]}>MILESTONES</Text>
              <View style={ledgerLine} />
              {data.milestones.map((m) => (
                <View key={m.id} style={ledgerRow}>
                  <Text style={[m.achieved ? ledgerText({ fontSize: 14 }) : ledgerDim({ fontSize: 14 })]}>
                    {m.achieved ? '✓ ' : ''}{m.label}
                  </Text>
                </View>
              ))}
              <View style={ledgerLine} />
            </View>
          </>
        )}

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(185, 28, 28, 0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
