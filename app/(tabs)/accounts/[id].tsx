import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useTheme } from '../../../lib/theme-context';
import { spacing, radii } from '../../../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerSection,
  ledgerRow,
} from '../../../lib/ledger-theme';
import { formatCurrency, formatCurrencyOrHide, parseAmountToCents, parsePaymentDueDate } from '../../../lib/format';
import { useHideAmounts } from '../../../lib/hide-amounts-context';
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
  const { hideAmounts } = useHideAmounts();
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
      <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
        <BackHeader variant="ledger" title="Account" onBack={() => router.back()} />
        <View style={[styles.loading, { backgroundColor: LEDGER_BG }]}>
          <Text style={ledgerDim({ fontSize: 14 })}>Loading…</Text>
        </View>
      </View>
    );
  }
  if (account === null) {
    return (
      <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
        <BackHeader variant="ledger" title="Account" onBack={() => router.back()} />
        <View style={[styles.loading, { backgroundColor: LEDGER_BG }]}>
          <Text style={ledgerDim({ fontSize: 14 })}>Account not found</Text>
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
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader variant="ledger" title={account.name} subtitle={typeConfig.label} onBack={() => router.back()} />

        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <View style={ledgerLine} />
          <View style={[ledgerRow, { paddingVertical: spacing.lg }]}>
            <Text style={ledgerDim({ fontSize: 12 })}>Balance</Text>
            <Text style={[ledgerText(), { fontSize: 18, color: isDebt ? '#DC2626' : '#B91C1C' }]}>
              {formatCurrencyOrHide(account.currentBalance, hideAmounts)}
            </Text>
          </View>
          {isDebt && (account.interestRate != null || account.minimumPayment != null || account.nextPaymentDueDate) && (
            <>
              <View style={ledgerLine} />
              {account.interestRate != null && (
                <View style={ledgerRow}>
                  <Text style={ledgerDim({ fontSize: 12 })}>APR</Text>
                  <Text style={ledgerText({ fontSize: 14 })}>{(account.interestRate * 100).toFixed(1)}%</Text>
                </View>
              )}
              {account.minimumPayment != null && (
                <View style={ledgerRow}>
                  <Text style={ledgerDim({ fontSize: 12 })}>Min payment</Text>
                  <Text style={ledgerText({ fontSize: 14 })}>{formatCurrencyOrHide(account.minimumPayment, hideAmounts)}/mo</Text>
                </View>
              )}
              {account.nextPaymentDueDate && (
                <View style={ledgerRow}>
                  <Text style={ledgerDim({ fontSize: 12 })}>Due date</Text>
                  <Text style={ledgerText({ fontSize: 14 })}>{formatDueDate(account.nextPaymentDueDate)}</Text>
                </View>
              )}
            </>
          )}
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.sm }]}>
            RECENT TRANSACTIONS
          </Text>
          <View style={ledgerLine} />
          {transactions.length === 0 ? (
            <Text style={[ledgerDim(), { fontSize: 14, paddingVertical: spacing.xl }]}>
              No transactions for this account yet.
            </Text>
          ) : (
            transactions.slice(0, 20).map((t) => {
              const isOut = t.amount < 0;
              const catName = t.categoryId ? categoryMap[t.categoryId] : null;
              return (
                <View key={t._id} style={[ledgerRow, { paddingVertical: spacing.md }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[ledgerText(), { fontSize: 14 }]} numberOfLines={1}>
                      {t.merchantName}
                    </Text>
                    {catName && (
                      <Text style={[ledgerDim(), { fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
                        {catName}
                      </Text>
                    )}
                  </View>
                  <Text style={[ledgerText({ fontSize: 14 }), { color: isOut ? '#DC2626' : '#B91C1C' }]}>
                    {formatCurrencyOrHide(t.amount, hideAmounts, { signed: true })}
                  </Text>
                </View>
              );
            })
          )}
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.sm }]}>
            SETTINGS
          </Text>
          <View style={ledgerLine} />
          <Pressable
            style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
            onPress={() => {
              setReconcileBalance((account.currentBalance / 100).toFixed(2));
              setReconcileOpen(true);
            }}
          >
            <Text style={[ledgerText(), { fontSize: 14 }]}>Reconcile balance</Text>
            <Ionicons name="chevron-forward" size={18} color="#7F1D1D" />
          </Pressable>
          {isDebt && (
            <Pressable
              style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setEditRate(account.interestRate != null ? String(account.interestRate * 100) : '');
                setEditMinPay(account.minimumPayment != null ? (account.minimumPayment / 100).toFixed(2) : '');
                setEditDueDate(account.nextPaymentDueDate ?? '');
                setEditOpen(true);
              }}
            >
              <Text style={[ledgerText(), { fontSize: 14 }]}>Edit details (APR, due date)</Text>
              <Ionicons name="chevron-forward" size={18} color="#7F1D1D" />
            </Pressable>
          )}
          <Pressable style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]} onPress={handleDelete}>
            <Text style={[ledgerText(), { fontSize: 14, color: '#DC2626' }]}>Remove account</Text>
            <Ionicons name="chevron-forward" size={18} color="#7F1D1D" />
          </Pressable>
          <View style={ledgerLine} />
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
                  {reconcileDiff === 0 ? 'Matches' : `Difference: ${formatCurrencyOrHide(Math.abs(reconcileDiff), hideAmounts, { signed: true })}`}
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
  modalOverlay: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  modalCardWrap: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  modalCard: { borderRadius: radii.lg, padding: spacing.xl },
  modalActions: { gap: spacing.sm, marginTop: spacing.md },
});
