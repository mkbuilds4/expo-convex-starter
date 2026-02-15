import { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  SectionList,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Doc } from '../../convex/_generated/dataModel';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii, typography } from '../../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerHeaderRow,
  ledgerBtn,
  ledgerSection,
  ledgerRow,
  ledgerEmpty,
} from '../../lib/ledger-theme';
import {
  formatCurrency,
  getCurrentMonth,
  parseAmountToCents,
  formatTransactionDateLabel,
} from '../../lib/format';
import { Text, Button, Input } from '../../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

type TxnWithAccount = Doc<'transactions'> & { account?: Doc<'accounts'> };

type Section = { title: string; data: TxnWithAccount[] };

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const transactions = useQuery(api.transactions.listAll, { limit: 150 }) ?? [];
  const accounts = useQuery(api.accounts.list) ?? [];
  const categories = useQuery(api.budget.listCategories) ?? [];
  const linkedPlaidItems = useQuery(api.plaid.listLinkedPlaidItems) ?? [];
  const createTransaction = useMutation(api.transactions.create);
  const syncPlaidTransactions = useAction(api.plaid.syncPlaidTransactions);

  const [modalVisible, setModalVisible] = useState(false);
  const [importPickerVisible, setImportPickerVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => { m[c._id] = c.name; });
    return m;
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.merchantName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (t.notes ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesCategory =
        filterCategoryId === 'all' || t.categoryId === filterCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, filterCategoryId]);

  const sections: Section[] = useMemo(() => {
    const byDate = new Map<string, TxnWithAccount[]>();
    for (const t of filteredTransactions) {
      const key = t.date;
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(t);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({ title: formatTransactionDateLabel(date), data }));
  }, [filteredTransactions]);

  const hasPlaidAccounts = accounts.some((a) => a.plaidItemId);
  const syncAllBanks = selectedImportItemIds.length === 0;

  const toggleImportItem = (itemId: Id<'plaidItems'>) => {
    setSelectedImportItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refetch is automatic via Convex; optionally trigger sync
      if (hasPlaidAccounts) {
        await syncPlaidTransactions({});
      }
    } catch {
      // Ignore; list will still refetch
    } finally {
      setRefreshing(false);
    }
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

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[ledgerSection, { paddingTop: spacing.lg }]}>
      <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.sm }]}>
        {section.title}
      </Text>
      <View style={ledgerLine} />
    </View>
  );

  const renderItem = ({ item: t }: { item: TxnWithAccount }) => {
    const isOutflow = t.amount < 0;
    const categoryName = t.categoryId ? categoryMap[t.categoryId] : null;
    const subtitle = [categoryName, t.account?.name].filter(Boolean).join(' · ') || null;
    return (
      <View style={[ledgerRow, { paddingVertical: spacing.md }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ledgerText(), { fontSize: 14 }]} numberOfLines={1}>
            {t.merchantName}
          </Text>
          {subtitle && (
            <Text style={[ledgerDim(), { fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <Text
          style={[
            ledgerText({ fontSize: 14 }),
            { color: isOutflow ? '#DC2626' : '#B91C1C', marginLeft: spacing.sm },
          ]}
        >
          {formatCurrency(t.amount, { signed: true })}
        </Text>
      </View>
    );
  };

  const listEmpty = (
    <View style={[ledgerEmpty, { paddingTop: spacing.xxl }]}>
      <Text style={[ledgerDim(), { fontSize: 14, marginBottom: spacing.lg }]}>
        No transactions yet. Add one or import from bank.
      </Text>
      <Pressable
        style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }, { marginRight: spacing.sm }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={ledgerText({ fontSize: 12 })}>+ ADD TXN</Text>
      </Pressable>
      {hasPlaidAccounts && (
        <Pressable
          style={({ pressed }) => [ledgerBtn, { marginTop: spacing.sm }, pressed && { opacity: 0.7 }]}
          onPress={() => setImportPickerVisible(true)}
          disabled={syncing}
        >
          <Text style={ledgerText({ fontSize: 12 })}>{syncing ? 'IMPORTING…' : 'IMPORT'}</Text>
        </Pressable>
      )}
    </View>
  );

  const listHeader =
    transactions.length > 0 ? (
      <View style={[ledgerSection, { paddingTop: spacing.lg }]}>
        <View style={[styles.searchWrap, { borderWidth: 1, borderColor: '#7F1D1D', marginBottom: spacing.sm }]}>
          <Ionicons name="search" size={18} color="#7F1D1D" style={styles.searchIcon} />
          <Input
            placeholder="Search merchant or notes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { backgroundColor: 'transparent', marginBottom: 0, color: '#B91C1C' }]}
            placeholderTextColor="#7F1D1D"
          />
        </View>
        <View style={styles.filterChipRow}>
          <Pressable
            style={[ledgerBtn, filterCategoryId !== 'all' && { opacity: 0.6 }]}
            onPress={() => setFilterCategoryId('all')}
          >
            <Text style={ledgerText({ fontSize: 11 })}>ALL</Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c._id}
              style={[ledgerBtn, filterCategoryId !== c._id && { opacity: 0.6 }]}
              onPress={() => setFilterCategoryId(c._id)}
            >
              <Text style={ledgerText({ fontSize: 11 })} numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={[ledgerLine, { marginTop: spacing.md }]} />
      </View>
    ) : null;

  return (
    <>
      <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
        <View style={[ledgerHeader, { paddingTop: insets.top, paddingBottom: spacing.md }]}>
          <View style={ledgerHeaderRow}>
            <View>
              <Text style={[ledgerText(), { fontSize: 16, letterSpacing: 1 }]}>TRANSACTIONS</Text>
              <Text style={[ledgerDim(), { fontSize: 12, marginTop: 2 }]}>Spending & income</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={ledgerText({ fontSize: 12 })}>+ TXN</Text>
              </Pressable>
              {hasPlaidAccounts && (
                <Pressable
                  style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setImportPickerVisible(true)}
                  disabled={syncing}
                >
                  <Text style={ledgerText({ fontSize: 12 })}>{syncing ? '…' : 'IMPORT'}</Text>
                </Pressable>
              )}
            </View>
          </View>
          <View style={ledgerLine} />
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>{listEmpty}</View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              filteredTransactions.length === 0 ? (
                <View style={[ledgerEmpty, { paddingTop: spacing.xl }]}>
                  <Text style={ledgerDim({ fontSize: 14 })}>
                    No transactions match your search or filter.
                  </Text>
                </View>
              ) : null
            }
            stickySectionHeadersEnabled
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#7F1D1D"
              />
            }
          />
        )}
      </View>

      {/* Import from bank modal */}
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
                  No linked banks. Link an account in the Accounts tab first.
                </Text>
              ) : (
                <>
                  <Text variant="caption" style={[styles.label, { color: colors.muted }]}>
                    Choose which linked account(s) to import from
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

      {/* Add transaction modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.modalContent, { paddingTop: insets.top, flex: 1 }]}>
            <View style={styles.modalHeader}>
              <Text variant="title">Add transaction</Text>
              <Button variant="link" onPress={() => setModalVisible(false)}>
                Cancel
              </Button>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                placeholder="Merchant or payee"
                value={merchant}
                onChangeText={setMerchant}
              />
              <Input
                placeholder="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Pressable
                style={[styles.toggleRow, { backgroundColor: colors.surface }]}
                onPress={() => setIsExpense(!isExpense)}
              >
                <Text variant="body" style={{ color: colors.text }}>
                  {isExpense ? 'Expense (money out)' : 'Income (money in)'}
                </Text>
                <Ionicons
                  name={isExpense ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={22}
                  color={colors.primary}
                />
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
                      { backgroundColor: accountId === a._id ? colors.primary : colors.surface },
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
              <Button
                onPress={handleSubmit}
                disabled={!accountId || !merchant.trim()}
              >
                Save transaction
              </Button>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    paddingLeft: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1 },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emptyContainer: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  modalOverlay: { flex: 1 },
  modalContent: { flex: 1, paddingHorizontal: spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalBody: { flex: 1 },
  modalBodyContent: { paddingBottom: spacing.xxl },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  label: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
});
