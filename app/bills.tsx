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
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerSection,
  ledgerSectionLabel,
  ledgerRow,
  ledgerBtn,
  ledgerHeaderRow,
} from '../lib/ledger-theme';
import { useLedgerStyles } from '../lib/financial-state-context';

function parseDueDay(input: string): number | null {
  const n = parseInt(input.trim(), 10);
  if (Number.isNaN(n) || n < 1 || n > 31) return null;
  return n;
}

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accent, accentDim } = useLedgerStyles();
  const bills = useQuery(api.bills.list) ?? [];
  const totalCents = useQuery(api.bills.getTotalMonthlyCents) ?? 0;
  const createBill = useMutation(api.bills.create);
  const updateBill = useMutation(api.bills.update);
  const removeBill = useMutation(api.bills.remove);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<'recurringBills'> | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setDueDay('');
    setModalOpen(true);
  };

  const openEdit = (id: Id<'recurringBills'>, bill: { name: string; amount: number; dueDay: number }) => {
    setEditingId(id);
    setName(bill.name);
    setAmount((bill.amount / 100).toFixed(2));
    setDueDay(String(bill.dueDay));
    setModalOpen(true);
  };

  const handleSave = async () => {
    const amt = parseAmountToCents(amount);
    const day = parseDueDay(dueDay);
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a name' });
      return;
    }
    if (amt < 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    if (day === null) {
      Toast.show({ type: 'error', text1: 'Due day must be 1–31' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateBill({ id: editingId, name: name.trim(), amount: amt, dueDay: day });
        Toast.show({ type: 'success', text1: 'Bill updated' });
      } else {
        await createBill({ name: name.trim(), amount: amt, dueDay: day });
        Toast.show({ type: 'success', text1: 'Bill added' });
      }
      setModalOpen(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: Id<'recurringBills'>, billName: string) => {
    Alert.alert('Remove bill', `Remove "${billName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeBill({ id });
          Toast.show({ type: 'success', text1: 'Bill removed' });
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
            title="Recurring bills"
            subtitle="Monthly expenses for your income target"
            onBack={() => router.back()}
            variant="ledger"
          />
          <View style={ledgerLine} />
        </View>

        <View style={[ledgerSection, styles.summarySection]}>
          <Text style={[ledgerDim(), ledgerSectionLabel]}>TOTAL PER MONTH</Text>
          <View style={ledgerLine} />
          <View style={[ledgerRow, styles.summaryRow]}>
            <Text style={ledgerDim({ fontSize: 12 })}>Bills total</Text>
            <Text style={[ledgerText(), { fontSize: 22 }]}>{formatCurrency(totalCents)}</Text>
          </View>
          <Text style={[ledgerDim(), { fontSize: 11, marginTop: spacing.sm }]}>
            Add bills below. This total is used on the debt plan to show how much you need to make.
          </Text>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <View style={ledgerHeaderRow}>
            <Text style={[ledgerDim(), ledgerSectionLabel]}>YOUR BILLS</Text>
            <Pressable onPress={openAdd} style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}>
              <Text style={ledgerText({ fontSize: 11 })}>+ ADD BILL</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
          {bills.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[ledgerDim(), { fontSize: 14 }]}>
                No recurring bills yet. Add rent, utilities, subscriptions, etc.
              </Text>
              <Pressable onPress={openAdd} style={({ pressed }) => [ledgerBtn, styles.addFirstBtn, pressed && { opacity: 0.7 }]}>
                <Text style={ledgerText({ fontSize: 12 })}>Add first bill</Text>
              </Pressable>
            </View>
          ) : (
            bills.map((bill) => (
              <Pressable
                key={bill._id}
                style={({ pressed }) => [ledgerRow, styles.billRow, pressed && { opacity: 0.8 }]}
                onPress={() => openEdit(bill._id, bill)}
              >
                <View style={styles.billLeft}>
                  <Text style={ledgerText({ fontSize: 15 })} numberOfLines={1}>
                    {bill.name}
                  </Text>
                  <Text style={ledgerDim({ fontSize: 11 })}>Due day {bill.dueDay}</Text>
                </View>
                <View style={styles.billRight}>
                  <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(bill.amount)}/mo</Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleDelete(bill._id, bill.name)}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={accentDim} />
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
          <View style={ledgerLine} />
        </View>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { borderColor: accentDim + '40' }]}>
              <Text style={[ledgerText(), styles.modalTitle]}>{editingId ? 'Edit bill' : 'Add bill'}</Text>
              <View style={[styles.modalTitleLine, { backgroundColor: accent }]} />
              <Input
                placeholder="Name (e.g. Rent, Netflix)"
                value={name}
                onChangeText={setName}
                style={[styles.modalInput, { borderColor: accentDim + '50' }]}
                placeholderTextColor={accentDim + '99'}
              />
              <Input
                placeholder="Amount per month (e.g. 1200)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={[styles.modalInput, { borderColor: accentDim + '50' }]}
                placeholderTextColor={accentDim + '99'}
              />
              <Input
                placeholder="Due day of month (1–31)"
                value={dueDay}
                onChangeText={setDueDay}
                keyboardType="number-pad"
                style={[styles.modalInput, { borderColor: accentDim + '50' }]}
                placeholderTextColor={accentDim + '99'}
              />
              <View style={styles.modalActions}>
                <Button onPress={handleSave} loading={saving} disabled={saving}>
                  {editingId ? 'Save' : 'Add bill'}
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
  summarySection: { paddingTop: spacing.xl },
  summaryRow: { paddingVertical: spacing.lg },
  emptyState: {
    paddingVertical: spacing.xl,
    paddingRight: spacing.lg,
  },
  addFirstBtn: { marginTop: spacing.xl, alignSelf: 'flex-start' },
  billRow: { paddingVertical: spacing.lg },
  billLeft: { flex: 1, minWidth: 0 },
  billRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  modalActions: { gap: spacing.md, marginTop: spacing.xl },
});
