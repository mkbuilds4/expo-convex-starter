import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
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
  ledgerEmpty,
} from '../lib/ledger-theme';
import { useLedgerAccent } from '../lib/financial-state-context';
import { formatCurrency, formatDateLong } from '../lib/format';
import { parseAmountToCents } from '../lib/format';
import { Text, Button, Input, BackHeader } from '../components';
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
  const { accent } = useLedgerAccent();
  const data = useQuery(api.debt.getDebtPayoffProjection);
  const billsTotalCents = useQuery(api.bills.getTotalMonthlyCents) ?? 0;
  const incomeSummary = useQuery(api.income.getIncomeSummary);
  const setPlan = useMutation(api.debt.setPlan);

  const [planOpen, setPlanOpen] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');
  const [extraInput, setExtraInput] = useState('');
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
      });
      Toast.show({ type: 'success', text1: 'Mission updated' });
      setPlanOpen(false);
      setTargetDateInput('');
      setExtraInput('');
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
    setPlanOpen(true);
  };

  if (data === undefined) {
    return (
      <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
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
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl, backgroundColor: LEDGER_BG }]}
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
                <Text style={[ledgerText({ fontSize: 14 }), isShortfall && { color: '#DC2626' }, isSurplus && surplusCents > 0 && { color: '#15803d' }]}>
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
                    <Text style={[ledgerText({ fontSize: 14 }), { color: '#DC2626' }]}>Add {formatCurrency(addMoreToHitTarget)}/mo</Text>
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
                    <Text style={[ledgerText({ fontSize: 14 }), !onTrack && { color: '#DC2626' }]}>
                      {formatDateLong(projectedDate)} {onTrack ? '' : '(behind)'}
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
        <View style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: accent }]}>
              <Text style={ledgerText({ fontSize: 16 })}>SET FINISH LINE</Text>
              <Text style={[ledgerDim(), { marginBottom: spacing.sm }]}>Debt-free date (YYYY-MM-DD)</Text>
              <Input
                placeholder="2027-12-31"
                placeholderTextColor={accent}
                value={targetDateInput}
                onChangeText={setTargetDateInput}
                style={[styles.modalInput, { borderColor: accent, color: accent }]}
              />
              <Input
                placeholder="Extra per month (optional) e.g. 200"
                placeholderTextColor={accent}
                value={extraInput}
                onChangeText={setExtraInput}
                keyboardType="decimal-pad"
                style={[styles.modalInput, { borderColor: accent, color: accent }]}
              />
              <View style={styles.modalActions}>
                <Pressable style={({ pressed }) => [ledgerBtn, styles.modalBtn, pressed && { opacity: 0.7 }]} onPress={handleSavePlan} disabled={saving}>
                  <Text style={ledgerText({ fontSize: 14 })}>{saving ? '…' : 'SAVE'}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                  onPress={() => { setPlanOpen(false); setTargetDateInput(''); setExtraInput(''); }}
                  disabled={saving}
                >
                  <Text style={ledgerDim({ fontSize: 14 })}>Cancel</Text>
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
  modalCard: { padding: spacing.xl },
  modalInput: { backgroundColor: '#0a0a0a', borderWidth: 1 },
  modalActions: { gap: spacing.sm, marginTop: spacing.md },
  modalBtn: { width: '100%' },
  modalCancel: { alignItems: 'center', paddingVertical: spacing.sm },
});
