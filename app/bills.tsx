import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../lib/theme-context';
import { spacing, radii } from '../lib/theme';
import { formatCurrency, parseAmountToCents } from '../lib/format';
import { Text, Button, Input, BackHeader } from '../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

function parseDueDay(input: string): number | null {
  const n = parseInt(input.trim(), 10);
  if (Number.isNaN(n) || n < 1 || n > 31) return null;
  return n;
}

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          title="Recurring bills"
          subtitle="Monthly expenses for your income target"
          onBack={() => router.back()}
        />

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
            Total per month
          </Text>
          <Text variant="cardTitle" style={{ color: colors.primary }}>
            {formatCurrency(totalCents)}
          </Text>
          <Text variant="caption" style={{ color: colors.muted, marginTop: spacing.xs }}>
            Add bills below. This total is used on the debt plan to show how much you need to make.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
              Your bills
            </Text>
            <Pressable onPress={openAdd} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                + Add bill
              </Text>
            </Pressable>
          </View>
          {bills.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
                No recurring bills yet. Add rent, utilities, subscriptions, etc.
              </Text>
              <Button onPress={openAdd} style={styles.addFirstBtn}>
                Add first bill
              </Button>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {bills.map((bill) => (
                <Pressable
                  key={bill._id}
                  style={({ pressed }) => [
                    styles.billRow,
                    pressed && { opacity: 0.8 },
                    bill !== bills[bills.length - 1] && { borderBottomWidth: 1, borderBottomColor: colors.background },
                  ]}
                  onPress={() => openEdit(bill._id, bill)}
                >
                  <View style={styles.billLeft}>
                    <Text variant="body" style={{ color: colors.text }} numberOfLines={1}>
                      {bill.name}
                    </Text>
                    <Text variant="caption" style={{ color: colors.muted }}>
                      Due day {bill.dueDay}
                    </Text>
                  </View>
                  <View style={styles.billRight}>
                    <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
                      {formatCurrency(bill.amount)}/mo
                    </Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => handleDelete(bill._id, bill.name)}
                      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text variant="cardTitle" style={{ color: colors.text }}>
                {editingId ? 'Edit bill' : 'Add bill'}
              </Text>
              <Input
                placeholder="Name (e.g. Rent, Netflix)"
                value={name}
                onChangeText={setName}
              />
              <Input
                placeholder="Amount per month (e.g. 1200)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Input
                placeholder="Due day of month (1–31)"
                value={dueDay}
                onChangeText={setDueDay}
                keyboardType="number-pad"
              />
              <View style={styles.modalActions}>
                <Button onPress={handleSave} loading={saving} disabled={saving}>
                  {editingId ? 'Save' : 'Add bill'}
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => setModalOpen(false)}
                  disabled={saving}
                >
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
  scrollContent: { paddingHorizontal: spacing.lg },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  section: { marginBottom: spacing.xl },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  summaryCard: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  billLeft: { flex: 1, minWidth: 0 },
  billRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addFirstBtn: { marginTop: spacing.lg },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCardWrap: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  modalCard: { borderRadius: radii.lg, padding: spacing.xl },
  modalActions: { gap: spacing.sm, marginTop: spacing.md },
});
