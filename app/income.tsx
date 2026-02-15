import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { spacing, radii } from '../lib/theme';
import { formatCurrency, parseAmountToCents, getCurrentMonth, formatDateLong } from '../lib/format';
import { Text, Input, BackHeader } from '../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import {
  LEDGER_BG,
  LEDGER_FONT,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerSection,
  ledgerRow,
  ledgerBtn,
  ledgerSectionLabel,
} from '../lib/ledger-theme';
import { useLedgerStyles } from '../lib/financial-state-context';

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one-time', label: 'One time' },
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
  const { accent, accentDim } = useLedgerStyles();
  const params = useLocalSearchParams<{ add?: string }>();
  const month = getCurrentMonth();
  const sources = useQuery(api.income.listSources) ?? [];
  const totalMonthly = useQuery(api.income.getTotalMonthlyFromSources) ?? 0;
  const entriesThisMonth = useQuery(api.income.listEntriesByMonth, { month }) ?? [];
  const receivedThisMonth = useQuery(api.income.getTotalReceivedInMonth, { month }) ?? 0;
  const createSource = useMutation(api.income.createSource);
  const updateSource = useMutation(api.income.updateSource);
  const removeSource = useMutation(api.income.removeSource);
  const addEntry = useMutation(api.income.addEntry);
  const removeEntry = useMutation(api.income.removeEntry);

  const [modalOpen, setModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const didOpenAddRef = useRef(false);

  useEffect(() => {
    if (params.add === '1' && !didOpenAddRef.current) {
      didOpenAddRef.current = true;
      setModalOpen(true);
    }
  }, [params.add]);
  const [editingId, setEditingId] = useState<Id<'incomeSources'> | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [type, setType] = useState('');
  const [saving, setSaving] = useState(false);

  const [logSourceId, setLogSourceId] = useState<Id<'incomeSources'> | 'other' | null>(null);
  const [logSourceName, setLogSourceName] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logNote, setLogNote] = useState('');
  const [logSaving, setLogSaving] = useState(false);

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

  const openLogIncome = () => {
    setLogSourceId(sources.length > 0 ? null : 'other');
    setLogSourceName('');
    setLogAmount('');
    setLogDate(new Date().toISOString().slice(0, 10));
    setLogNote('');
    setLogModalOpen(true);
  };

  const handleLogSave = async () => {
    const amt = parseAmountToCents(logAmount);
    if (amt <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    const sourceId = logSourceId === 'other' || logSourceId === null ? undefined : (logSourceId as Id<'incomeSources'>);
    const sourceName =
      (logSourceId === 'other' || sources.length === 0) && logSourceName.trim()
        ? logSourceName.trim()
        : undefined;
    if (!sourceId && !sourceName) {
      Toast.show({ type: 'error', text1: sources.length ? 'Pick a source or use Other with a name' : 'Enter a source name' });
      return;
    }
    setLogSaving(true);
    try {
      await addEntry({
        sourceId,
        sourceName,
        amount: amt,
        date: logDate,
        note: logNote.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Income logged' });
      setLogModalOpen(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setLogSaving(false);
    }
  };

  const handleDeleteEntry = (entryId: Id<'incomeEntries'>, entryLabel: string) => {
    Alert.alert('Remove entry', `Remove ${entryLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeEntry({ id: entryId });
          Toast.show({ type: 'success', text1: 'Entry removed' });
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
          <Text style={[ledgerDim(), ledgerSectionLabel]}>TOTAL PER MONTH (EXPECTED)</Text>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>From all sources</Text>
            <Text style={ledgerText({ fontSize: 18 })}>{formatCurrency(totalMonthly)}</Text>
          </View>
          <Text style={[ledgerDim(), { fontSize: 11, marginTop: spacing.sm }]}>
            Expected from sources below. Log actual income to track what you receive each month.
          </Text>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <View style={styles.sectionRow}>
            <Text style={[ledgerDim(), ledgerSectionLabel]}>THIS MONTH'S INCOME</Text>
            <Pressable onPress={openLogIncome} style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}>
              <Text style={ledgerText({ fontSize: 11 })}>LOG INCOME</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
          <View style={ledgerRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>Received this month</Text>
            <Text style={ledgerText({ fontSize: 18 })}>{formatCurrency(receivedThisMonth)}</Text>
          </View>
          {entriesThisMonth.length === 0 ? (
            <Text style={[ledgerDim(), { fontSize: 12, marginTop: spacing.sm }]}>
              No income logged yet. Tap Log income to record what you've received.
            </Text>
          ) : (
            entriesThisMonth.map((entry) => (
              <Pressable
                key={entry._id}
                style={({ pressed }) => [ledgerRow, styles.entryRow, pressed && { opacity: 0.8 }]}
                onLongPress={() => handleDeleteEntry(entry._id, `${entry.sourceName} ${formatCurrency(entry.amount)}`)}
              >
                <View style={styles.entryLeft}>
                  <Text style={ledgerText({ fontSize: 14 })} numberOfLines={1}>{entry.sourceName}</Text>
                  <Text style={ledgerDim({ fontSize: 11 })}>{formatDateLong(entry.date)}</Text>
                </View>
                <View style={styles.entryRight}>
                  <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(entry.amount)}</Text>
                  <Pressable hitSlop={8} onPress={() => handleDeleteEntry(entry._id, `${entry.sourceName} ${formatCurrency(entry.amount)}`)} style={({ pressed: p }) => [p && { opacity: 0.7 }]}>
                    <Ionicons name="trash-outline" size={18} color={ledgerDim().color} />
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
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
                    {source.frequency === 'one-time' ? formatCurrency(source.amount) : `${formatCurrency(source.amount)}/${source.frequency === 'annual' ? 'yr' : source.frequency === 'monthly' ? 'mo' : source.frequency === 'biweekly' ? '2wk' : 'wk'}`}
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
            <View style={[styles.modalCard, { borderColor: accentDim + '80' }]}>
              <Text style={[ledgerText(), styles.modalTitle]}>{editingId ? 'Edit source' : 'Add income source'}</Text>
              <View style={[styles.modalTitleLine, { backgroundColor: accent }]} />
              <View style={styles.inputWrap}>
                <Input
                  placeholder="Name (e.g. Main job, Side gig)"
                  value={name}
                  onChangeText={setName}
                  style={[styles.modalInput, { borderColor: accentDim + '80', color: accent }]}
                  placeholderTextColor={accentDim + 'aa'}
                />
                <Input
                  placeholder="Amount per period (e.g. 3000)"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  style={[styles.modalInput, { borderColor: accentDim + '80', color: accent }]}
                  placeholderTextColor={accentDim + 'aa'}
                />
              </View>
              <Text style={[ledgerDim(), ledgerSectionLabel, styles.modalLabel]}>FREQUENCY</Text>
              <View style={styles.freqRow}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFrequency(opt.value)}
                    style={[
                      styles.chip,
                      { borderColor: frequency === opt.value ? accent : accentDim + '80' },
                      frequency === opt.value && { backgroundColor: accent + '22' },
                    ]}
                  >
                    <Text style={frequency === opt.value ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[ledgerDim(), ledgerSectionLabel, styles.modalLabel, { marginTop: spacing.lg }]}>TYPE (OPTIONAL)</Text>
              <View style={styles.freqRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    style={[
                      styles.chip,
                      { borderColor: type === opt.value ? accent : accentDim + '80' },
                      type === opt.value && { backgroundColor: accent + '22' },
                    ]}
                  >
                    <Text style={type === opt.value ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleSave}
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
                    <Text style={styles.modalBtnPrimaryText}>{editingId ? 'Save' : 'Add source'}</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setModalOpen(false)}
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

      <Modal visible={logModalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { borderColor: accentDim + '80' }]}>
              <Text style={[ledgerText(), styles.modalTitle]}>Log income</Text>
              <View style={[styles.modalTitleLine, { backgroundColor: accent }]} />
              {sources.length > 0 && (
                <>
                  <Text style={[ledgerDim(), ledgerSectionLabel, styles.modalLabel]}>SOURCE</Text>
                  <View style={styles.freqRow}>
                    {sources.map((src) => (
                      <Pressable
                        key={src._id}
                        onPress={() => setLogSourceId(src._id)}
                        style={[
                          styles.chip,
                          { borderColor: logSourceId === src._id ? accent : accentDim + '80' },
                          logSourceId === src._id && { backgroundColor: accent + '22' },
                        ]}
                      >
                        <Text style={logSourceId === src._id ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })} numberOfLines={1}>{src.name}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setLogSourceId('other')}
                      style={[
                        styles.chip,
                        { borderColor: logSourceId === 'other' ? accent : accentDim + '80' },
                        logSourceId === 'other' && { backgroundColor: accent + '22' },
                      ]}
                    >
                      <Text style={logSourceId === 'other' ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })}>Other</Text>
                    </Pressable>
                  </View>
                  {logSourceId === 'other' && (
                    <Input
                      placeholder="Source name"
                      value={logSourceName}
                      onChangeText={setLogSourceName}
                      style={[styles.modalInput, { borderColor: accentDim + '80', color: accent, marginTop: spacing.sm }]}
                      placeholderTextColor={accentDim + 'aa'}
                    />
                  )}
                </>
              )}
              {sources.length === 0 && (
                <>
                  <Text style={[ledgerDim(), ledgerSectionLabel, styles.modalLabel]}>SOURCE</Text>
                  <Input
                    placeholder="e.g. Main job, Freelance"
                    value={logSourceName}
                    onChangeText={setLogSourceName}
                    style={[styles.modalInput, { borderColor: accentDim + '80', color: accent }]}
                    placeholderTextColor={accentDim + 'aa'}
                  />
                </>
              )}
              <Text style={[ledgerDim(), ledgerSectionLabel, styles.modalLabel]}>AMOUNT</Text>
              <Input
                placeholder="Amount received"
                value={logAmount}
                onChangeText={setLogAmount}
                keyboardType="decimal-pad"
                style={[styles.modalInput, { borderColor: accentDim + '80', color: accent }]}
                placeholderTextColor={accentDim + 'aa'}
              />
              <Text style={[ledgerDim(), ledgerSectionLabel, styles.modalLabel]}>DATE</Text>
              <Input
                placeholder="YYYY-MM-DD"
                value={logDate}
                onChangeText={setLogDate}
                style={[styles.modalInput, { borderColor: accentDim + '80', color: accent }]}
                placeholderTextColor={accentDim + 'aa'}
              />
              <Input
                placeholder="Note (optional)"
                value={logNote}
                onChangeText={setLogNote}
                style={[styles.modalInput, { borderColor: accentDim + '80', color: accent }]}
                placeholderTextColor={accentDim + 'aa'}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleLogSave}
                  disabled={logSaving}
                  style={({ pressed }) => [
                    styles.modalBtnPrimary,
                    { backgroundColor: accent },
                    (logSaving || pressed) && { opacity: pressed ? 0.9 : 0.8 },
                  ]}
                >
                  {logSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>Log income</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setLogModalOpen(false)}
                  disabled={logSaving}
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
  scrollContent: { paddingHorizontal: 0 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  entryRow: { paddingVertical: spacing.md },
  entryLeft: { flex: 1, minWidth: 0 },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    borderRadius: radii.md,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  modalTitle: { fontSize: 18, letterSpacing: 0.5, marginBottom: spacing.sm },
  modalTitleLine: {
    height: 1,
    opacity: 0.5,
    marginBottom: spacing.xl,
  },
  inputWrap: { marginBottom: spacing.sm },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  modalLabel: {
    marginBottom: spacing.xs,
  },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  modalActions: { gap: spacing.md, marginTop: spacing.xl },
  modalBtnPrimary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    width: '100%',
  },
  modalBtnPrimaryText: {
    fontFamily: LEDGER_FONT,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  modalBtnSecondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    width: '100%',
    borderWidth: 1,
  },
});
