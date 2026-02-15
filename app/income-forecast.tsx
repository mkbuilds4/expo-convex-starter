import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { spacing } from '../lib/theme';
import { formatCurrency, parseAmountToCents } from '../lib/format';
import { Text, Button, Input, BackHeader } from '../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import {
  LEDGER_BG,
  LEDGER_RED_DIM,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerSection,
  ledgerRow,
  ledgerBtn,
  ledgerSectionLabel,
} from '../lib/ledger-theme';

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export default function IncomeForecastScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const summary = useQuery(api.income.getIncomeSummary);
  const forecasts = useQuery(api.income.listForecasts) ?? [];
  const addForecast = useMutation(api.income.addForecast);
  const removeForecast = useMutation(api.income.removeForecast);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'one-time' | 'recurring'>('recurring');
  const [frequency, setFrequency] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setName('');
    setAmount('');
    setKind('recurring');
    setFrequency('monthly');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const amt = parseAmountToCents(amount);
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a name' });
      return;
    }
    if (amt < 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    if (kind === 'recurring' && !frequency) {
      Toast.show({ type: 'error', text1: 'Select a frequency for recurring' });
      return;
    }
    setSaving(true);
    try {
      await addForecast({
        name: name.trim(),
        amount: amt,
        kind,
        frequency: kind === 'recurring' ? frequency : undefined,
      });
      Toast.show({ type: 'success', text1: 'Job added to forecast' });
      setModalOpen(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: Id<'incomeForecasts'>, jobName: string) => {
    Alert.alert('Remove from forecast', `Remove "${jobName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeForecast({ id });
          Toast.show({ type: 'success', text1: 'Removed' });
        },
      },
    ]);
  };

  const totalFromSources = summary?.totalMonthlyFromSources ?? 0;
  const projectedWithRecurring = summary?.projectedMonthlyWithRecurringForecasts ?? totalFromSources;
  const oneTimeTotal = (summary?.oneTimeForecasts ?? []).reduce((s, f) => s + f.amount, 0);

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <BackHeader
            title="Income forecast"
            subtitle="See how much you could make from jobs you take on"
            onBack={() => router.back()}
            variant="ledger"
          />
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), ledgerSectionLabel]}>CURRENT vs PROJECTED</Text>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>From income sources</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(totalFromSources)}/mo</Text>
          </View>
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>With recurring jobs below</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(projectedWithRecurring)}/mo</Text>
          </View>
          {oneTimeTotal > 0 && (
            <View style={ledgerRow}>
              <Text style={ledgerDim({ fontSize: 12 })}>One-time (total)</Text>
              <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(oneTimeTotal)}</Text>
            </View>
          )}
          <Text style={[ledgerDim(), { fontSize: 11, marginTop: spacing.sm }]}>
            Add potential jobs to see how they would change your monthly income.
          </Text>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <View style={styles.sectionRow}>
            <Text style={[ledgerDim(), ledgerSectionLabel]}>POTENTIAL JOBS</Text>
            <Pressable onPress={openAdd} style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}>
              <Text style={ledgerText({ fontSize: 11 })}>+ ADD JOB</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
          {forecasts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[ledgerDim(), { fontSize: 12 }]}>
                No potential jobs yet. Add gigs or opportunities to forecast extra income.
              </Text>
              <Pressable onPress={openAdd} style={({ pressed }) => [ledgerBtn, styles.addFirstBtn, pressed && { opacity: 0.7 }]}>
                <Text style={ledgerText({ fontSize: 12 })}>Add first job</Text>
              </Pressable>
            </View>
          ) : (
            forecasts.map((f) => (
              <Pressable key={f._id} style={[ledgerRow, { justifyContent: 'space-between' }]}>
                <View style={styles.sourceLeft}>
                  <Text style={ledgerText({ fontSize: 14 })} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={ledgerDim({ fontSize: 11 })}>
                    {f.kind === 'one-time'
                      ? `One-time ${formatCurrency(f.amount)}`
                      : `${formatCurrency(f.amount)}/${f.frequency === 'annual' ? 'yr' : f.frequency === 'monthly' ? 'mo' : f.frequency === 'biweekly' ? '2wk' : 'wk'}`}
                  </Text>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleDelete(f._id, f.name)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="trash-outline" size={18} color={LEDGER_RED_DIM} />
                </Pressable>
              </Pressable>
            ))
          )}
          <View style={ledgerLine} />
        </View>

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { borderColor: LEDGER_RED_DIM, borderWidth: 1 }]}>
              <Text style={[ledgerText(), styles.modalTitle]}>Add potential job</Text>
              <Input placeholder="Name (e.g. Weekend gig, One-off project)" value={name} onChangeText={setName} />
              <Input placeholder="Amount (e.g. 500)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              <Text style={[ledgerDim(), { fontSize: 11, marginBottom: spacing.xs }]}>Kind</Text>
              <View style={styles.freqRow}>
                <Pressable onPress={() => setKind('recurring')} style={[styles.chip, kind === 'recurring' && styles.chipSelected]}>
                  <Text style={kind === 'recurring' ? ledgerText({ fontSize: 11 }) : ledgerDim({ fontSize: 11 })}>Recurring</Text>
                </Pressable>
                <Pressable onPress={() => setKind('one-time')} style={[styles.chip, kind === 'one-time' && styles.chipSelected]}>
                  <Text style={kind === 'one-time' ? ledgerText({ fontSize: 11 }) : ledgerDim({ fontSize: 11 })}>One-time</Text>
                </Pressable>
              </View>
              {kind === 'recurring' && (
                <>
                  <Text style={[ledgerDim(), { fontSize: 11, marginBottom: spacing.xs, marginTop: spacing.sm }]}>Frequency</Text>
                  <View style={styles.freqRow}>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => setFrequency(opt.value)}
                        style={[styles.chip, frequency === opt.value && styles.chipSelected]}
                      >
                        <Text style={frequency === opt.value ? ledgerText({ fontSize: 11 }) : ledgerDim({ fontSize: 11 })}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <View style={styles.modalActions}>
                <Button onPress={handleSave} loading={saving} disabled={saving}>
                  Add to forecast
                </Button>
                <Button variant="secondary" onPress={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
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
  scrollContent: { paddingHorizontal: 0 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sourceLeft: { flex: 1, minWidth: 0 },
  empty: { paddingVertical: spacing.lg, paddingRight: spacing.lg },
  addFirstBtn: { marginTop: spacing.md, alignSelf: 'flex-start' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCardWrap: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  modalCard: {
    borderRadius: 0,
    padding: spacing.xl,
  },
  modalTitle: { fontSize: 18, marginBottom: spacing.md },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: LEDGER_BG,
  },
  chipSelected: { borderColor: LEDGER_RED_DIM },
  modalActions: { gap: spacing.sm, marginTop: spacing.lg },
});
