import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useTheme } from '../../../lib/theme-context';
import { spacing, radii } from '../../../lib/theme';
import { formatCurrency, parseAmountToCents, parsePaymentDueDate } from '../../../lib/format';
import { Text, Button, Input, BackHeader } from '../../../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const ACCOUNT_TYPES = [
  { type: 'depository', subtype: 'checking', label: 'Checking', icon: 'wallet-outline' as const },
  { type: 'depository', subtype: 'savings', label: 'Savings', icon: 'trending-up-outline' as const },
  { type: 'credit', subtype: 'credit card', label: 'Credit card', icon: 'card-outline' as const },
  { type: 'loan', subtype: 'loan', label: 'Loan', icon: 'cash-outline' as const },
];

function formatDueDate(dateStr: string): string {
  const [, m, day] = dateStr.split('-').map(Number);
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec';
  const monthName = months.split(' ')[(m || 1) - 1];
  return `${monthName} ${day || ''}`;
}

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';

  const accountId = id as Id<'accounts'>;
  const account = useQuery(api.accounts.get, id ? { id: accountId } : 'skip');
  const transactions = useQuery(
    api.transactions.listByAccount,
    id ? { accountId, limit: 50 } : 'skip'
  ) ?? [];
  const categories = useQuery(api.budget.listCategories) ?? [];
  const updateBalance = useMutation(api.accounts.updateBalance);
  const updateAccount = useMutation(api.accounts.update);
  const removeAccount = useMutation(api.accounts.remove);

  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileBalance, setReconcileBalance] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editRate, setEditRate] = useState('');
  const [editMinPay, setEditMinPay] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => { m[c._id] = c.name; });
    return m;
  }, [categories]);

  if (id === undefined) return null;
  if (account === undefined) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <BackHeader title="Account" onBack={() => router.back()} />
        <View style={[styles.loading, { backgroundColor: colors.background }]}>
          <Text variant="body" style={{ color: colors.muted }}>Loading…</Text>
        </View>
      </View>
    );
  }
  if (account === null) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <BackHeader title="Account" onBack={() => router.back()} />
        <View style={[styles.loading, { backgroundColor: colors.background }]}>
          <Text variant="body" style={{ color: colors.muted }}>Account not found</Text>
          <Button onPress={() => router.back()}>Back to accounts</Button>
        </View>
      </View>
    );
  }

  const typeConfig = ACCOUNT_TYPES.find((t) => t.subtype === account.subtype) ?? ACCOUNT_TYPES[0];
  const isDebt = account.type === 'credit' || account.type === 'loan';
  const accentColor = isDebt ? colors.error : colors.primary;

  const handleReconcile = () => {
    const cents = parseAmountToCents(reconcileBalance || '0');
    updateBalance({ id: account._id, currentBalance: cents, availableBalance: cents });
    setReconcileOpen(false);
    setReconcileBalance('');
    Toast.show({ type: 'success', text1: 'Balance updated' });
  };

  const handleSaveDetails = () => {
    const rate = editRate.trim() ? parseFloat(editRate) / 100 : undefined;
    const minPay = editMinPay.trim() ? parseAmountToCents(editMinPay) : undefined;
    const due = editDueDate.trim() ? parsePaymentDueDate(editDueDate) : undefined;
    updateAccount({
      id: account._id,
      interestRate: rate,
      minimumPayment: minPay,
      nextPaymentDueDate: editDueDate.trim() === '' ? '' : due,
    });
    setEditOpen(false);
    setEditRate('');
    setEditMinPay('');
    setEditDueDate('');
    Toast.show({ type: 'success', text1: 'Updated' });
  };

  const handleDelete = () => {
    Alert.alert('Remove account', `Remove "${account.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeAccount({ id: account._id });
          Toast.show({ type: 'success', text1: 'Account removed' });
          router.back();
        },
      },
    ]);
  };

  const reconcileDiff = account.currentBalance - parseAmountToCents(reconcileBalance || '0');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader title={account.name} subtitle={typeConfig.label} onBack={() => router.back()} />

        {/* Overview card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: accentColor + (isDark ? '28' : '20') }]}>
              <Ionicons name={typeConfig.icon} size={28} color={accentColor} />
            </View>
            <View style={styles.balanceBlock}>
              <Text variant="caption" style={{ color: colors.muted }}>Balance</Text>
              <Text variant="title" style={{ color: accentColor }}>
                {formatCurrency(account.currentBalance)}
              </Text>
            </View>
          </View>
          {isDebt && (account.interestRate != null || account.minimumPayment != null || account.nextPaymentDueDate) && (
            <View style={[styles.detailRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              {account.interestRate != null && (
                <View style={styles.detailItem}>
                  <Text variant="caption" style={{ color: colors.muted }}>APR</Text>
                  <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
                    {(account.interestRate * 100).toFixed(1)}%
                  </Text>
                </View>
              )}
              {account.minimumPayment != null && (
                <View style={styles.detailItem}>
                  <Text variant="caption" style={{ color: colors.muted }}>Min payment</Text>
                  <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
                    {formatCurrency(account.minimumPayment)}/mo
                  </Text>
                </View>
              )}
              {account.nextPaymentDueDate && (
                <View style={styles.detailItem}>
                  <Text variant="caption" style={{ color: colors.muted }}>Due date</Text>
                  <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
                    {formatDueDate(account.nextPaymentDueDate)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text variant="caption" style={[styles.sectionTitle, { color: colors.muted }]}>
            Recent transactions
          </Text>
          {transactions.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
                No transactions for this account yet.
              </Text>
            </View>
          ) : (
            transactions.slice(0, 20).map((t) => {
              const isOut = t.amount < 0;
              const catName = t.categoryId ? categoryMap[t.categoryId] : null;
              return (
                <View
                  key={t._id}
                  style={[styles.txnRow, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                >
                  <View style={styles.txnLeft}>
                    <Text variant="body" style={{ color: colors.text }} numberOfLines={1}>
                      {t.merchantName}
                    </Text>
                    {catName && (
                      <Text variant="caption" style={{ color: colors.muted }} numberOfLines={1}>
                        {catName}
                      </Text>
                    )}
                  </View>
                  <Text variant="body" style={{ color: isOut ? colors.error : colors.primary, fontWeight: '600' }}>
                    {formatCurrency(t.amount, { signed: true })}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Settings / actions */}
        <View style={styles.section}>
          <Text variant="caption" style={[styles.sectionTitle, { color: colors.muted }]}>
            Settings
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setReconcileBalance((account.currentBalance / 100).toFixed(2));
                setReconcileOpen(true);
              }}
            >
              <Ionicons name="sync-outline" size={22} color={colors.primary} />
              <Text variant="body" style={{ color: colors.text, flex: 1 }}>Reconcile balance</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
            {isDebt && (
              <Pressable
                style={({ pressed }) => [styles.menuRow, styles.menuRowBorder, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setEditRate(account.interestRate != null ? String(account.interestRate * 100) : '');
                  setEditMinPay(account.minimumPayment != null ? (account.minimumPayment / 100).toFixed(2) : '');
                  setEditDueDate(account.nextPaymentDueDate ?? '');
                  setEditOpen(true);
                }}
              >
                <Ionicons name="pencil-outline" size={22} color={colors.primary} />
                <Text variant="body" style={{ color: colors.text, flex: 1 }}>Edit details (APR, due date)</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.menuRow, styles.menuRowBorder, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, pressed && { opacity: 0.7 }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text variant="body" style={{ color: colors.error, flex: 1 }}>Remove account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Reconcile modal */}
      <Modal visible={reconcileOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text variant="cardTitle" style={{ color: colors.text }}>Reconcile balance</Text>
              <Text variant="caption" style={{ color: colors.muted }}>Enter the current balance from your bank or statement.</Text>
              <Input
                placeholder="Balance (e.g. 1500.00)"
                value={reconcileBalance}
                onChangeText={setReconcileBalance}
                keyboardType="decimal-pad"
              />
              {reconcileBalance.trim() !== '' && (
                <Text variant="caption" style={{ color: reconcileDiff === 0 ? colors.primary : colors.error }}>
                  {reconcileDiff === 0 ? 'Matches' : `Difference: ${formatCurrency(Math.abs(reconcileDiff), { signed: true })}`}
                </Text>
              )}
              <View style={styles.modalActions}>
                <Button onPress={handleReconcile}>Update</Button>
                <Button variant="secondary" onPress={() => { setReconcileOpen(false); setReconcileBalance(''); }}>Cancel</Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit details modal (debt) */}
      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={styles.modalCardWrap}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text variant="cardTitle" style={{ color: colors.text }}>Edit details</Text>
              <Input placeholder="Interest rate % (e.g. 18)" value={editRate} onChangeText={setEditRate} keyboardType="decimal-pad" />
              <Input placeholder="Minimum payment $ (e.g. 50)" value={editMinPay} onChangeText={setEditMinPay} keyboardType="decimal-pad" />
              <Input placeholder="Payment due (e.g. 15 or 2026-02-15)" value={editDueDate} onChangeText={setEditDueDate} />
              <View style={styles.modalActions}>
                <Button onPress={handleSaveDetails}>Save</Button>
                <Button variant="secondary" onPress={() => { setEditOpen(false); setEditRate(''); setEditMinPay(''); setEditDueDate(''); }}>Cancel</Button>
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  iconWrap: { width: 56, height: 56, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  balanceBlock: { flex: 1 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1 },
  detailItem: {},
  section: { marginTop: spacing.xl },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  txnLeft: { flex: 1, minWidth: 0, marginRight: spacing.md },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  menuRowBorder: { borderTopWidth: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  modalCardWrap: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  modalCard: { borderRadius: radii.lg, padding: spacing.xl },
  modalActions: { gap: spacing.sm, marginTop: spacing.md },
});
