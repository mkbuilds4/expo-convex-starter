import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
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
  ledgerHeaderRow,
  ledgerSection,
  ledgerRow,
  ledgerBtn,
} from '../lib/ledger-theme';
import { formatCurrency } from '../lib/format';
import { Text, BackHeader } from '../components';

export default function DebtIncomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const billsTotalCents = useQuery(api.bills.getTotalMonthlyCents) ?? 0;
  const incomeFromSources = useQuery(api.income.getTotalMonthlyFromSources) ?? 0;
  const incomeSummary = useQuery(api.income.getIncomeSummary);
  const data = useQuery(api.debt.getDebtPayoffProjection);
  const hasDebt = data && data.totalDebtNow > 0;
  const debtMonthly = hasDebt ? (data?.requiredMonthlyTotalCents ?? 0) : 0;
  const incomeTargetCents = billsTotalCents + debtMonthly;

  const projectedMonthlyCents = incomeSummary?.projectedMonthlyWithRecurringForecasts ?? incomeFromSources;
  const hasForecastJobs = (incomeSummary?.totalMonthlyFromRecurringForecasts ?? 0) > 0;
  const surplusCents = projectedMonthlyCents - incomeTargetCents;
  const isSurplus = surplusCents >= 0;
  const isShortfall = surplusCents < 0;

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <BackHeader title="Income target" subtitle="What you need to make each month" onBack={() => router.back()} variant="ledger" />
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <View style={ledgerHeaderRow}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>TOTAL</Text>
            <Pressable style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]} onPress={() => router.push('/bills')}>
              <Text style={ledgerText({ fontSize: 11 })}>EDIT BILLS</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Need to make</Text>
            <Text style={ledgerText({ fontSize: 18 })}>{formatCurrency(incomeTargetCents)}</Text>
          </View>
          <Text style={[ledgerDim(), { fontSize: 11, marginTop: spacing.sm }]}>
            To cover recurring bills and debt payments each month.
          </Text>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>BREAKDOWN</Text>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Recurring bills</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(billsTotalCents)}</Text>
          </View>
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Debt (minimums + extra)</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(debtMonthly)}</Text>
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <View style={ledgerHeaderRow}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>YOUR INCOME</Text>
            <Pressable style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]} onPress={() => router.push('/income')}>
              <Text style={ledgerText({ fontSize: 11 })}>SOURCES</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
          <Pressable style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.8 }]} onPress={() => router.push('/income')}>
            <Text style={ledgerDim({ fontSize: 12 })}>From tracked sources</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(incomeFromSources)}/mo</Text>
          </Pressable>
          {hasForecastJobs && (
            <Pressable style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.8 }]} onPress={() => router.push('/income-forecast')}>
              <Text style={ledgerDim({ fontSize: 12 })}>+ Forecast (potential jobs)</Text>
              <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(incomeSummary!.totalMonthlyFromRecurringForecasts)}/mo</Text>
            </Pressable>
          )}
          <Text style={[ledgerDim(), { fontSize: 11, marginTop: spacing.xs }]}>
            Track salary, freelance & gigs in Income. Add potential jobs in Income forecast.
          </Text>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <View style={ledgerHeaderRow}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>FORECAST VS NEED</Text>
            {hasForecastJobs && (
              <Pressable style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]} onPress={() => router.push('/income-forecast')}>
                <Text style={ledgerText({ fontSize: 11 })}>FORECAST</Text>
              </Pressable>
            )}
          </View>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Projected this month</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(projectedMonthlyCents)}</Text>
          </View>
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Need this month</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(incomeTargetCents)}</Text>
          </View>
          <View style={[ledgerRow, styles.comparisonResult]}>
            <Text style={ledgerDim({ fontSize: 12 })}>{isSurplus ? 'Surplus' : 'Shortfall'}</Text>
            <Text
              style={[
                ledgerText({ fontSize: 18 }),
                isShortfall && { color: '#DC2626' },
                isSurplus && { color: '#15803d' },
              ]}
            >
              {isSurplus ? '+' : ''}{formatCurrency(surplusCents)}
            </Text>
          </View>
          <Text style={[ledgerDim(), { fontSize: 11, marginTop: spacing.xs }]}>
            {isShortfall
              ? `You're ${formatCurrency(-surplusCents)} short of what you need. Add income or reduce bills/debt target.`
              : isSurplus && surplusCents > 0
                ? 'Projected income covers your need with room to spare.'
                : 'Projected income matches your need.'}
          </Text>
          <View style={ledgerLine} />
        </View>

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  comparisonResult: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
