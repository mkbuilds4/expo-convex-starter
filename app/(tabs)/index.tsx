import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { spacing } from '../../lib/theme';
import {
  LEDGER_BG,
  ledgerHeader,
  ledgerSection,
  ledgerEmpty,
} from '../../lib/ledger-theme';
import { useLedgerStyles } from '../../lib/financial-state-context';
import { formatCurrency, formatCurrencyOrHide, getCurrentMonth, getTimeGreeting, formatMonth, getDaysLeftInMonth } from '../../lib/format';
import { useHideAmounts } from '../../lib/hide-amounts-context';
import { Text } from '../../components';
import { authClient } from '../../lib/auth-client';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hideAmounts, setHideAmounts } = useHideAmounts();
  const { ledgerText, ledgerDim, ledgerLine, accent, accentDim } = useLedgerStyles();
  const month = getCurrentMonth();
  const dashboard = useQuery(api.budget.getDashboard, { month });
  const netWorth = useQuery(api.networth.getSummary);
  const debtProjection = useQuery(api.debt.getDebtPayoffProjection);
  const billsTotalCents = useQuery(api.bills.getTotalMonthlyCents) ?? 0;
  const receivedThisMonth = useQuery(api.income.getTotalReceivedInMonth, { month }) ?? 0;
  const expectedFromSources = useQuery(api.income.getTotalMonthlyFromSources) ?? 0;
  const incomeForTarget = receivedThisMonth > 0 ? receivedThisMonth : expectedFromSources;
  const { data: session } = authClient.useSession();

  const hasDebt = debtProjection && debtProjection.totalDebtNow > 0;
  const debtMonthly = hasDebt ? (debtProjection?.requiredMonthlyTotalCents ?? 0) : 0;
  const incomeTargetCents = billsTotalCents + debtMonthly;
  const showIncomeTarget = incomeTargetCents > 0;
  const needMoreCents = showIncomeTarget && incomeForTarget < incomeTargetCents ? incomeTargetCents - incomeForTarget : 0;
  const daysLeftInMonth = getDaysLeftInMonth();
  const perDayCents = needMoreCents > 0 && daysLeftInMonth > 0 ? Math.ceil(needMoreCents / daysLeftInMonth) : 0;
  const showPerDay = needMoreCents > 0 && daysLeftInMonth > 0;

  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || 'there';
  const greeting = getTimeGreeting();

  const accounts = (dashboard?.onBudgetAccounts ?? []).filter((a) => a.type === 'depository');

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.lg }]}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={[ledgerText(), { fontSize: 18, letterSpacing: 1 }]}>HOME</Text>
              <Text style={[ledgerDim(), { fontSize: 14, marginTop: 4 }]}>
                {greeting}, {firstName} · {formatMonth(month)}
              </Text>
            </View>
            <Pressable
              onPress={() => setHideAmounts(!hideAmounts)}
              style={({ pressed }) => [styles.hideAmountsBtn, pressed && { opacity: 0.7 }]}
              hitSlop={12}
              accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
              accessibilityRole="button"
            >
              <Ionicons
                name={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={accentDim}
              />
            </Pressable>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.headerBtn, { borderColor: accent }, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/budget')}
            >
              <Text style={ledgerText({ fontSize: 13 })}>BUDGET</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerBtn, { borderColor: accent }, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/transactions')}
            >
              <Text style={ledgerText({ fontSize: 13 })}>+ TXN</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerBtn, { borderColor: accent }, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/accounts')}
            >
              <Text style={ledgerText({ fontSize: 13 })}>ACCTS</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
        </View>

        {/* This month: need to make + debt plan link */}
        {showIncomeTarget && (
          <View style={[ledgerSection, styles.contentSection]}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>THIS MONTH · DEBT PLAN</Text>
            <View style={ledgerLine} />
            <Pressable
              style={({ pressed }) => [styles.contentRow, styles.debtPlanRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/debt-plan')}
            >
              <View style={styles.debtPlanLeft}>
                <Text style={[ledgerDim(), styles.rowLabel]}>Need to make</Text>
                <Text style={[ledgerText(), { fontSize: 20 }]}>{formatCurrency(incomeTargetCents)}</Text>
                {needMoreCents > 0 && (
                  <Text style={[ledgerDim(), { fontSize: 12, marginTop: spacing.xs }]}>
                    Need {formatCurrency(needMoreCents)} more (vs tracked income)
                    {showPerDay && ` · About ${formatCurrency(perDayCents)}/day for the next ${daysLeftInMonth} days`}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={accentDim} />
            </Pressable>
            {needMoreCents > 0 && (
              <Pressable
                style={({ pressed }) => [styles.contentRow, styles.addIncomeRow, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/income?add=1')}
              >
                <Text style={[ledgerDim(), styles.rowLabel]}>Add income source</Text>
                <Ionicons name="add-circle-outline" size={20} color={accent} />
              </Pressable>
            )}
            <View style={ledgerLine} />
          </View>
        )}

        {/* Accounts summary */}
        <View style={[ledgerSection, styles.contentSection]}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>CHECKING & SAVINGS</Text>
          <View style={ledgerLine} />
          {accounts.length === 0 ? (
            <View style={[ledgerEmpty, styles.emptyBlock]}>
              <Text style={ledgerDim({ fontSize: 16 })}>No accounts yet. Add one in Accounts.</Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { borderColor: accent }, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/(tabs)/accounts')}
              >
                <Text style={ledgerText({ fontSize: 14 })}>+ ADD ACCOUNT</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {accounts.slice(0, 4).map((acc) => (
                <Pressable
                  key={acc._id}
                  style={({ pressed }) => [styles.contentRow, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push('/(tabs)/accounts')}
                >
                  <Text style={[ledgerText(), styles.rowLabel]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={[ledgerText(), styles.rowValue]}>
                    {formatCurrencyOrHide(acc.availableBalance ?? acc.currentBalance, hideAmounts)}
                  </Text>
                </Pressable>
              ))}
              {accounts.length > 4 && (
                <Pressable
                  style={({ pressed }) => [styles.contentRow, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push('/(tabs)/accounts')}
                >
                  <Text style={[ledgerDim(), { fontSize: 15 }]}>View all {accounts.length} accounts</Text>
                  <Ionicons name="chevron-forward" size={18} color={accentDim} />
                </Pressable>
              )}
              <View style={ledgerLine} />
            </>
          )}
        </View>

        {/* Net worth teaser */}
        {netWorth && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0) && (
          <View style={[ledgerSection, styles.contentSection]}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>NET WORTH</Text>
            <View style={ledgerLine} />
            <Pressable
              style={({ pressed }) => [styles.contentRow, styles.netWorthRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/networth')}
            >
              <Text style={[ledgerDim(), styles.rowLabel]}>Total</Text>
              <Text
                style={[
                  ledgerText(),
                  styles.rowValue,
                  netWorth.netWorth < 0 && { color: '#DC2626' },
                ]}
              >
                {formatCurrencyOrHide(netWorth.netWorth, hideAmounts)}
              </Text>
            </Pressable>
            <View style={ledgerLine} />
          </View>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  hideAmountsBtn: {
    padding: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  headerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    paddingTop: spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  rowLabel: {
    fontSize: 17,
    flex: 1,
    marginRight: spacing.md,
  },
  rowValue: {
    fontSize: 17,
  },
  netWorthRow: {
    paddingVertical: spacing.xl,
  },
  debtPlanRow: {
    paddingVertical: spacing.xl,
  },
  addIncomeRow: {
    paddingVertical: spacing.md,
    paddingTop: 0,
  },
  debtPlanLeft: {
    flex: 1,
    minWidth: 0,
  },
  emptyBlock: {
    paddingTop: spacing.xl,
  },
  primaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
  },
});
