import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { formatCurrency, getCurrentMonth, parseAmountToCents } from '../../lib/format';
import { Text, Button, Input } from '../../components';
import Toast from 'react-native-toast-message';

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const transactions = useQuery(api.transactions.listAll, { limit: 80 }) ?? [];
  const accounts = useQuery(api.accounts.list) ?? [];
  const categories = useQuery(api.budget.listCategories) ?? [];
  const linkedPlaidItems = useQuery(api.plaid.listLinkedPlaidItems) ?? [];
  const createTransaction = useMutation(api.transactions.create);
  const syncPlaidTransactions = useAction(api.plaid.syncPlaidTransactions);

  const [modalVisible, setModalVisible] = useState(false);
  const [importPickerVisible, setImportPickerVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedImportItemIds, setSelectedImportItemIds] = useState<Id<'plaidItems'>[]>([]);
  const [accountId, setAccountId] = useState<Id<'accounts'> | ''>('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<Id<'budgetCategories'> | ''>('');
  const [isExpense, setIsExpense] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<Id<'budgetCategories'> | 'all'>('all');

  const today = getCurrentMonth();

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = !searchQuery.trim() ||
      t.merchantName.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesCategory = filterCategoryId === 'all' || t.categoryId === filterCategoryId;
    return matchesSearch && matchesCategory;
  });

  const hasPlaidAccounts = accounts.some((a) => a.plaidItemId);
  const syncAllBanks = selectedImportItemIds.length === 0;

  const toggleImportItem = (itemId: Id<'plaidItems'>) => {
    setSelectedImportItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const runImport = async () => {
    setSyncing(true);
    setImportPickerVisible(false);
    try {
      const result = await syncPlaidTransactions(
        syncAllBanks ? {} : { itemIds: selectedImportItemIds }
      );
      Toast.show({
        type: result.imported > 0 || result.updated > 0 ? 'success' : 'info',
        text1: result.message ?? (result.imported > 0 ? 'Transactions imported' : 'Done'),
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Import failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async () => {
    if (!accountId || !merchant.trim()) return;
    const cents = parseAmountToCents(amount || '0');
    const finalCents = isExpense ? -Math.abs(cents) : Math.abs(cents);
    try {
      await createTransaction({
        accountId,
        amount: finalCents,
        date: today,
        merchantName: merchant.trim(),
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
      });
      setAmount('');
      setMerchant('');
      setNotes('');
      setCategoryId('');
      setModalVisible(false);
      Toast.show({ type: 'success', text1: 'Transaction added' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="title">Transactions</Text>
          <Text variant="subtitle">Spending & income</Text>
        </View>

        <View style={styles.section}>
          <View style={{ gap: spacing.sm }}>
            <Button onPress={() => setModalVisible(true)}>Add transaction</Button>
            {hasPlaidAccounts && (
              <Button
                variant="secondary"
                onPress={() => setImportPickerVisible(true)}
                disabled={syncing}
              >
                {syncing ? 'Importing…' : 'Import from bank'}
              </Button>
            )}
          </View>
        </View>

        {transactions.length > 0 && (
          <View style={[styles.filterSection, { backgroundColor: colors.background }]}>
            <Input
              placeholder="Search by merchant..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            <View style={styles.filterChipRow}>
              <Pressable
                style={[styles.filterChip, { backgroundColor: filterCategoryId === 'all' ? colors.primary : colors.surface }]}
                onPress={() => setFilterCategoryId('all')}
              >
                <Text variant="caption" style={{ color: filterCategoryId === 'all' ? colors.onPrimary : colors.text }}>
                  All
                </Text>
              </Pressable>
              {categories.map((c) => (
                <Pressable
                  key={c._id}
                  style={[styles.filterChip, { backgroundColor: filterCategoryId === c._id ? colors.primary : colors.surface }]}
                  onPress={() => setFilterCategoryId(c._id)}
                >
                  <Text variant="caption" style={{ color: filterCategoryId === c._id ? colors.onPrimary : colors.text }} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {transactions.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <Text variant="body" style={{ color: colors.muted }}>
              No transactions yet. Add one or link a bank to import.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredTransactions.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.surface }]}>
                <Text variant="body" style={{ color: colors.muted }}>
                  No transactions match your search or filter.
                </Text>
              </View>
            ) : (
              filteredTransactions.map((t) => (
                <View key={t._id} style={[styles.row, { backgroundColor: colors.surface }]}>
                  <View style={styles.rowMain}>
                    <Text variant="body" style={{ color: colors.text }} numberOfLines={1}>
                      {t.merchantName}
                    </Text>
                    <Text variant="caption" style={{ color: colors.muted }}>
                      {t.date} · {t.account?.name ?? 'Account'}
                    </Text>
                  </View>
                  <Text
                    variant="body"
                    style={{ color: t.amount < 0 ? colors.error : colors.primary }}
                  >
                    {formatCurrency(t.amount, { signed: true })}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>

      <Modal visible={importPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalContent, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text variant="title">Import from bank</Text>
              <Button variant="link" onPress={() => setImportPickerVisible(false)}>
                Cancel
              </Button>
            </View>
            <View style={styles.modalBody}>
              {linkedPlaidItems.length === 0 ? (
                <Text variant="body" style={{ color: colors.muted }}>
                  No linked banks available. Link or re-link from the Accounts tab.
                </Text>
              ) : (
                <>
                  <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
                    Choose which linked account(s) to import transactions from
                  </Text>
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[
                        styles.chip,
                        { backgroundColor: syncAllBanks ? colors.primary : colors.surface },
                      ]}
                      onPress={() => setSelectedImportItemIds([])}
                    >
                      <Text
                        variant="caption"
                        style={{ color: syncAllBanks ? colors.onPrimary : colors.text }}
                      >
                        All linked banks
                      </Text>
                    </Pressable>
                    {linkedPlaidItems.map((item) => {
                      const selected = selectedImportItemIds.includes(item.itemId);
                      return (
                        <Pressable
                          key={item.itemId}
                          style={[
                            styles.chip,
                            { backgroundColor: selected ? colors.primary : colors.surface },
                          ]}
                          onPress={() => toggleImportItem(item.itemId)}
                        >
                          <Text
                            variant="caption"
                            style={{ color: selected ? colors.onPrimary : colors.text }}
                            numberOfLines={1}
                          >
                            {item.institutionName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Button onPress={runImport} disabled={syncing}>
                    {syncing ? 'Importing…' : 'Import'}
                  </Button>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalContent, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text variant="title">Add transaction</Text>
              <Button variant="link" onPress={() => setModalVisible(false)}>
                Cancel
              </Button>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Input placeholder="Merchant or payee" value={merchant} onChangeText={setMerchant} />
              <Input
                placeholder="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Pressable
                style={styles.toggleRow}
                onPress={() => setIsExpense(!isExpense)}
              >
                <Text variant="body" style={{ color: colors.text }}>
                  {isExpense ? 'Expense (money out)' : 'Income (money in)'}
                </Text>
                <Text variant="caption" style={{ color: colors.primary }}>
                  Tap to switch
                </Text>
              </Pressable>
              <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
                Account
              </Text>
              <View style={styles.chipRow}>
                {accounts.map((a) => (
                  <Pressable
                    key={a._id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: accountId === a._id ? colors.primary : colors.surface,
                      },
                    ]}
                    onPress={() => setAccountId(a._id)}
                  >
                    <Text
                      variant="caption"
                      style={{ color: accountId === a._id ? colors.onPrimary : colors.text }}
                      numberOfLines={1}
                    >
                      {a.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {categories.length > 0 && (
                <>
                  <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
                    Category (optional)
                  </Text>
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[
                        styles.chip,
                        { backgroundColor: !categoryId ? colors.primary : colors.surface },
                      ]}
                      onPress={() => setCategoryId('')}
                    >
                      <Text
                        variant="caption"
                        style={{ color: !categoryId ? colors.onPrimary : colors.text }}
                      >
                        None
                      </Text>
                    </Pressable>
                    {categories.map((c) => (
                      <Pressable
                        key={c._id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: categoryId === c._id ? colors.primary : colors.surface,
                          },
                        ]}
                        onPress={() => setCategoryId(c._id)}
                      >
                        <Text
                          variant="caption"
                          style={{ color: categoryId === c._id ? colors.onPrimary : colors.text }}
                          numberOfLines={1}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <Input placeholder="Notes" value={notes} onChangeText={setNotes} />
              <Button onPress={handleSubmit} disabled={!accountId || !merchant.trim()}>
                Save transaction
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  empty: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.md,
  },
  rowMain: { flex: 1, marginRight: spacing.md },
  modalOverlay: { flex: 1 },
  modalContent: { flex: 1, paddingHorizontal: spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalBody: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  label: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  filterSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  searchInput: { marginBottom: spacing.sm },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
});
