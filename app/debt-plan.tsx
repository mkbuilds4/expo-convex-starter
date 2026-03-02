import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useTheme } from '../lib/theme-context';
import { spacing, radii } from '../lib/theme';
import {
  ledgerHeader,
  ledgerHeaderRow,
  ledgerSection,
  ledgerRow,
  ledgerEmpty,
  LEDGER_FONT,
  useLedgerTheme,
} from '../lib/ledger-theme';
import { useLedgerAccent } from '../lib/financial-state-context';
import { formatCurrency, formatDateLong } from '../lib/format';
import { parseAmountToCents } from '../lib/format';
import { Text, Input, BackHeader } from '../components';
import Toast from 'react-native-toast-message';

function parseDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function DebtPlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { ledgerBg, ledgerText, ledgerDim, ledgerLine, ledgerBtn, resolvedScheme } = useLedgerTheme();
  const { accent, accentDim } = useLedgerAccent();
  const data = useQuery(api.debt.getDebtPayoffProjection);
  const billsTotalCents = useQuery(api.bills.getTotalMonthlyCents) ?? 0;
  const incomeSummary = useQuery(api.income.getIncomeSummary);
  const setPlan = useMutation(api.debt.setPlan);

  const [planOpen, setPlanOpen] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');
  const [extraInput, setExtraInput] = useState('');
  const [applySurplusInput, setApplySurplusInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSavePlan = async () => {
    const targetDate = parseDateInput(targetDateInput);
    if (!targetDate) {
      Toast.show({ type: 'error', text1: 'Enter a valid date (YYYY-MM-DD)' });
      return;
    }
    setSaving(true);
    try {
      await setPlan({
        targetDate,
        monthlyExtraCents: extraInput.trim() ? parseAmountToCents(extraInput) : undefined,
        applySurplusToDebt: applySurplusInput,
      });
      Toast.show({ type: 'success', text1: 'Mission updated' });
      setPlanOpen(false);
      setTargetDateInput('');
      setExtraInput('');
      setApplySurplusInput(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  const openPlanModal = () => {
    setTargetDateInput(data?.targetDate ?? '');
    setExtraInput(
      data?.monthlyExtraCents != null && data.monthlyExtraCents > 0
        ? (data.monthlyExtraCents / 100).toFixed(2)
        : ''
    );
    setApplySurplusInput(data?.applySurplusToDebt ?? false);
    setPlanOpen(true);
  };

  if (data === undefined) {
    return (
      <View style={[styles.screen, { backgroundColor: ledgerBg }]}>
        <BackHeader title="Debt plan" onBack={() => router.back()} variant="ledger" />
        <View style={[ledgerSection, styles.centered]}>
          <Text style={ledgerDim({ fontSize: 14 })}>Loading…</Text>
        </View>
      </View>
    );
  }

  const hasDebt = data.totalDebtNow > 0;
  const onTrack = data.projection.onTrack;
  const projectedDate = data.projection.projectedPayoffDate;
  const totalMonthly = data.requiredMonthlyTotalCents ?? 0;
  const totalMinimums = data.totalMinimumsCents ?? 0;
  const addMoreToHitTarget = data.addMoreToHitTargetCents ?? 0;
  const debtMonthly = hasDebt ? (data.requiredMonthlyTotalCents ?? 0) : 0;
  const incomeTargetCents = billsTotalCents + debtMonthly;
  const projectedMonthlyCents = incomeSummary?.projectedMonthlyWithRecurringForecasts ?? 0;
  const surplusCents = projectedMonthlyCents - incomeTargetCents;
  const isShortfall = surplusCents < 0;
  const isSurplus = surplusCents >= 0;

  return (
    <View style={[styles.screen, { backgroundColor: ledgerBg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl, backgroundColor: ledgerBg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <BackHeader title="Debt plan" onBack={() => router.back()} variant="ledger" />
          <View style={ledgerLine} />
        </View>

        {/* Income target: need to make this much each month */}
        <View style={ledgerSection}>
          <View style={ledgerHeaderRow}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>INCOME TARGET</Text>
            <Pressable style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]} onPress={() => router.push('/bills')}>
              <Text style={ledgerText({ fontSize: 11 })}>BILLS</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Need to make</Text>
            <Text style={ledgerText({ fontSize: 18 })}>{formatCurrency(incomeTargetCents)}</Text>
          </View>
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Bills</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(billsTotalCents)}</Text>
          </View>
          {hasDebt && (
            <View style={ledgerRow}>
              <Text style={ledgerDim({ fontSize: 12 })}>Debt (min + extra)</Text>
              <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(debtMonthly)}</Text>
            </View>
          )}
          {(incomeSummary != null && (incomeSummary.totalMonthlyFromSources > 0 || incomeSummary.totalMonthlyFromRecurringForecasts > 0)) && (
            <>
              <View style={ledgerRow}>
                <Text style={ledgerDim({ fontSize: 12 })}>Projected (sources + forecast)</Text>
                <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(projectedMonthlyCents)}</Text>
              </View>
              <View style={ledgerRow}>
                <Text style={ledgerDim({ fontSize: 12 })}>Vs need</Text>
                <Text style={[ledgerText({ fontSize: 14 }), isShortfall && { color: colors.error }, isSurplus && surplusCents > 0 && { color: colors.primary }]}>
                  {isSurplus ? '+' : ''}{formatCurrency(surplusCents)} {isShortfall ? 'short' : 'surplus'}
                </Text>
              </View>
            </>
          )}
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
            {/* 1. Main number: put this toward debt this month */}
            <View style={ledgerSection}>
              <Text style={[ledgerDim(), styles.sectionLabel]}>THIS MONTH</Text>
              <View style={ledgerLine} />
              <View style={ledgerRow}>
                <Text style={ledgerDim({ fontSize: 12 })}>Put toward debt</Text>
                <Text style={ledgerText({ fontSize: 18 })}>{formatCurrency(totalMonthly)}</Text>
              </View>
              {totalMinimums > 0 && (
                <View style={[ledgerRow, { paddingVertical: spacing.xs }]}>
                  <Text style={ledgerDim({ fontSize: 11 })}>
                    {formatCurrency(totalMinimums)} min
                    {(data.monthlyExtraCents ?? 0) > 0 ? ` + ${formatCurrency(data.monthlyExtraCents ?? 0)} extra` : ''}
                    {(data.applySurplusToDebt && (data.surplusCentsUsed ?? 0) > 0) ? ` + ${formatCurrency(data.surplusCentsUsed ?? 0)} surplus` : ''}
                  </Text>
                </View>
              )}
              <View style={ledgerLine} />
            </View>

            {/* 2. To hit your date (one line) or set finish line */}
            {data.targetDate && data.minimumExtraToHitTargetCents != null && (
              <View style={ledgerSection}>
                <Text style={[ledgerDim(), styles.sectionLabel]}>TO HIT {formatDateLong(data.targetDate).toUpperCase()}</Text>
                <View style={ledgerLine} />
                {addMoreToHitTarget > 0 ? (
                  <View style={ledgerRow}>
                    <Text style={[ledgerText({ fontSize: 14 }), { color: colors.error }]}>Add {formatCurrency(addMoreToHitTarget)}/mo</Text>
                    <Text style={ledgerDim({ fontSize: 11 })}>on top of minimums</Text>
                  </View>
                ) : (
                  <View style={ledgerRow}>
                    <Text style={ledgerText({ fontSize: 14 })}>On track</Text>
                  </View>
                )}
                <View style={ledgerLine} />
              </View>
            )}

            {/* 3. Finish line: target + projected + CHANGE */}
            <View style={ledgerSection}>
              <View style={ledgerHeaderRow}>
                <Text style={[ledgerDim(), styles.sectionLabel]}>FINISH LINE</Text>
                <Pressable style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]} onPress={openPlanModal}>
                  <Text style={ledgerText({ fontSize: 11 })}>{data.targetDate ? 'CHANGE' : 'SET'}</Text>
                </Pressable>
              </View>
              <View style={ledgerLine} />
              {data.targetDate ? (
                <>
                  <View style={ledgerRow}>
                    <Text style={ledgerDim({ fontSize: 12 })}>Target</Text>
                    <Text style={ledgerText({ fontSize: 14 })}>{formatDateLong(data.targetDate)}</Text>
                  </View>
                  <View style={ledgerRow}>
                    <Text style={ledgerDim({ fontSize: 12 })}>Projected</Text>
                    <Text style={[ledgerText({ fontSize: 14 }), !onTrack && { color: colors.error }]}>
                      {formatDateLong(projectedDate)} {onTrack ? '' : '(behind)'}
                    </Text>
                  </View>
                  <View style={[ledgerRow, { paddingVertical: spacing.xs }]}>
                    <Text style={ledgerDim({ fontSize: 11 })}>
                      {data.applySurplusToDebt && (data.surplusCentsUsed ?? 0) > 0
                        ? 'Based on min + extra + surplus'
                        : 'Based on min + extra'}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={ledgerEmpty}>
                  <Text style={ledgerDim({ fontSize: 14 })}>Set a target date to see how much extra you need.</Text>
                </View>
              )}
              <View style={ledgerLine} />
            </View>

            {/* 4. Links to more detail */}
            <View style={ledgerSection}>
              <Text style={[ledgerDim(), styles.sectionLabel]}>MORE</Text>
              <View style={ledgerLine} />
              <Pressable style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]} onPress={() => router.push('/debt-income')}>
                <Text style={ledgerDim({ fontSize: 14 })}>Income target</Text>
                <Text style={ledgerText({ fontSize: 12 })}>→</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]} onPress={() => router.push('/debt-targets')}>
                <Text style={ledgerDim({ fontSize: 14 })}>Payoff order</Text>
                <Text style={ledgerText({ fontSize: 12 })}>→</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]} onPress={() => router.push('/debt-progress')}>
                <Text style={ledgerDim({ fontSize: 14 })}>Progress & milestones</Text>
                <Text style={ledgerText({ fontSize: 12 })}>→</Text>
              </Pressable>
              <View style={ledgerLine} />
            </View>
          </>
        )}

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>

      <Modal visible={planOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: ledgerBg }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { borderColor: accentDim + '80', backgroundColor: accentDim + '15' }]}>
              <Text style={[ledgerText(), styles.modalTitle]}>SET FINISH LINE</Text>
              <View style={[styles.modalTitleLine, { backgroundColor: accent }]} />
              <Text style={[ledgerDim(), { fontSize: 12, marginBottom: spacing.xs }]}>Debt-free date (YYYY-MM-DD)</Text>
              <Input
                placeholder="2027-12-31"
                value={targetDateInput}
                onChangeText={setTargetDateInput}
                style={[
                  styles.modalInput,
                  {
                    borderColor: accentDim + '80',
                    color: accent,
                    backgroundColor: resolvedScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  },
                ]}
                placeholderTextColor={accentDim + 'aa'}
              />
              <Text style={[ledgerDim(), { fontSize: 12, marginBottom: spacing.xs }]}>Extra per month (optional)</Text>
              <Input
                placeholder="e.g. 200"
                value={extraInput}
                onChangeText={setExtraInput}
                keyboardType="decimal-pad"
                style={[
                  styles.modalInput,
                  {
                    borderColor: accentDim + '80',
                    color: accent,
                    backgroundColor: resolvedScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  },
                ]}
                placeholderTextColor={accentDim + 'aa'}
              />
              <View style={[ledgerRow, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                <Text style={[ledgerDim({ fontSize: 14 }), { flex: 1 }]}>Apply surplus to debt</Text>
                <Switch
                  value={applySurplusInput}
                  onValueChange={setApplySurplusInput}
                  trackColor={{ false: accentDim + '60', true: accent + '80' }}
                  thumbColor={applySurplusInput ? accent : accentDim}
                />
              </View>
              <Text style={[ledgerDim(), { fontSize: 11, marginBottom: spacing.md }]}>
                When on, forecasted surplus (projected income − bills − min − extra) is added to your monthly debt payment.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleSavePlan}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.modalBtnPrimary,
                    { backgroundColor: accent },
                    (saving || pressed) && { opacity: pressed ? 0.9 : 0.8 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>SAVE</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => { setPlanOpen(false); setTargetDateInput(''); setExtraInput(''); setApplySurplusInput(false); }}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.modalBtnSecondary,
                    { borderColor: accentDim },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[ledgerText({ fontSize: 14 }), { color: accent }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCardWrap: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  modalCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  modalTitle: { fontSize: 18, letterSpacing: 0.5, marginBottom: spacing.sm },
  modalTitleLine: {
    height: 1,
    opacity: 0.5,
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  modalActions: { gap: spacing.md, marginTop: spacing.xl },
  modalBtnPrimary: {
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    width: '100%',
  },
  modalBtnPrimaryText: {
    fontFamily: LEDGER_FONT,
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#fff',
  },
  modalBtnSecondary: {
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    width: '100%',
    borderWidth: 1,
  },
});
