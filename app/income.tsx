import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { spacing, radii } from '../lib/theme';
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

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'gig', label: 'Gig' },
  { value: 'other', label: 'Other' },
];

function frequencyLabel(freq: string): string {
  return FREQUENCY_OPTIONS.find((o) => o.value === freq)?.label ?? freq;
}

export default function IncomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sources = useQuery(api.income.listSources) ?? [];
  const totalMonthly = useQuery(api.income.getTotalMonthlyFromSources) ?? 0;
  const createSource = useMutation(api.income.createSource);
  const updateSource = useMutation(api.income.updateSource);
  const removeSource = useMutation(api.income.removeSource);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<'incomeSources'> | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [type, setType] = useState('');
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setFrequency('monthly');
    setType('');
    setModalOpen(true);
  };

  const openEdit = (source: { _id: Id<'incomeSources'>; name: string; amount: number; frequency: string; type?: string }) => {
    setEditingId(source._id);
    setName(source.name);
    setAmount((source.amount / 100).toFixed(2));
    setFrequency(source.frequency);
    setType(source.type ?? '');
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
    setSaving(true);
    try {
      if (editingId) {
        await updateSource({
          id: editingId,
          name: name.trim(),
          amount: amt,
          frequency,
          type: type || undefined,
        });
        Toast.show({ type: 'success', text1: 'Source updated' });
      } else {
        await createSource({
          name: name.trim(),
          amount: amt,
          frequency,
          type: type || undefined,
        });
        Toast.show({ type: 'success', text1: 'Income source added' });
      }
      setModalOpen(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: Id<'incomeSources'>, sourceName: string) => {
    Alert.alert('Remove income source', `Remove "${sourceName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeSource({ id });
          Toast.show({ type: 'success', text1: 'Source removed' });
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <BackHeader
            title="Income sources"
            subtitle="Track salary, freelance, gigs — used for income target"
            onBack={() => router.back()}
            variant="ledger"
          />
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), ledgerSectionLabel]}>TOTAL PER MONTH</Text>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>From all sources</Text>
            <Text style={ledgerText({ fontSize: 18 })}>{formatCurrency(totalMonthly)}</Text>
          </View>
          <Text style={[ledgerDim(), { fontSize: 11, marginTop: spacing.sm }]}>
            Add sources below. This total can be compared to your income target on the debt plan.
          </Text>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <View style={styles.sectionRow}>
            <Text style={[ledgerDim(), ledgerSectionLabel]}>YOUR SOURCES</Text>
            <Pressable onPress={openAdd} style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}>
              <Text style={ledgerText({ fontSize: 11 })}>+ ADD</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
          {sources.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[ledgerDim(), { fontSize: 12 }]}>No income sources yet. Add job, freelance, side gigs.</Text>
              <Pressable onPress={openAdd} style={({ pressed }) => [ledgerBtn, styles.addFirstBtn, pressed && { opacity: 0.7 }]}>
                <Text style={ledgerText({ fontSize: 12 })}>Add first source</Text>
              </Pressable>
            </View>
          ) : (
            sources.map((source) => (
              <Pressable
                key={source._id}
                style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.8 }]}
                onPress={() => openEdit(source)}
              >
                <View style={styles.sourceLeft}>
                  <Text style={ledgerText({ fontSize: 14 })} numberOfLines={1}>
                    {source.name}
                  </Text>
                  <Text style={ledgerDim({ fontSize: 11 })}>
                    {formatCurrency(source.amount)}/{source.frequency === 'annual' ? 'yr' : source.frequency === 'monthly' ? 'mo' : source.frequency === 'biweekly' ? '2wk' : 'wk'}
                    {source.type ? ` · ${source.type}` : ''}
                  </Text>
                </View>
                <View style={styles.sourceRight}>
                  <Text style={ledgerText({ fontSize: 12 })}>{frequencyLabel(source.frequency)}</Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleDelete(source._id, source.name)}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={ledgerDim().color} />
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
          <View style={ledgerLine} />
        </View>

        <Pressable style={({ pressed }) => [styles.forecastLink, pressed && { opacity: 0.8 }]} onPress={() => router.push('/income-forecast')}>
          <Text style={ledgerDim({ fontSize: 12 })}>Forecast income from potential jobs →</Text>
        </Pressable>

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { borderColor: ledgerLine.backgroundColor }]}>
              <Text style={[ledgerText(), styles.modalTitle]}>{editingId ? 'Edit source' : 'Add income source'}</Text>
              <Input placeholder="Name (e.g. Main job, Side gig)" value={name} onChangeText={setName} />
              <Input placeholder="Amount per period (e.g. 3000)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              <Text style={[ledgerDim(), { fontSize: 11, marginBottom: spacing.xs }]}>Frequency</Text>
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
              <Text style={[ledgerDim(), { fontSize: 11, marginBottom: spacing.xs, marginTop: spacing.sm }]}>Type (optional)</Text>
              <View style={styles.freqRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    style={[styles.chip, type === opt.value && styles.chipSelected]}
                  >
                    <Text style={type === opt.value ? ledgerText({ fontSize: 11 }) : ledgerDim({ fontSize: 11 })}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Button onPress={handleSave} loading={saving} disabled={saving}>
                  {editingId ? 'Save' : 'Add source'}
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
  sourceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  empty: { paddingVertical: spacing.lg, paddingRight: spacing.lg },
  addFirstBtn: { marginTop: spacing.md, alignSelf: 'flex-start' },
  forecastLink: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCardWrap: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  modalCard: {
    borderWidth: 1,
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
