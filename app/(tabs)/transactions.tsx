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
import { spacing, radii } from '../../lib/theme';
import {
  LEDGER_BG,
  LEDGER_FONT,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerHeaderRow,
  ledgerBtn,
  ledgerSection,
  ledgerRow,
  ledgerEmpty,
  ledgerSectionLabel,
} from '../../lib/ledger-theme';
import { useLedgerStyles } from '../../lib/financial-state-context';
import {
  formatCurrency,
  parseAmountToCents,
  formatTransactionDateLabel,
  formatDateLong,
} from '../../lib/format';
import { Text, Button, Input } from '../../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

type TxnWithAccount = Doc<'transactions'> & { account?: Doc<'accounts'> };

type Section = { title: string; data: TxnWithAccount[] };

const todayDate = () => new Date().toISOString().slice(0, 10);

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { accent, accentDim } = useLedgerStyles();
  const transactions = useQuery(api.transactions.listAll, { limit: 150 }) ?? [];
  const accounts = useQuery(api.accounts.list) ?? [];
  const categories = useQuery(api.budget.listCategories) ?? [];
  const linkedPlaidItems = useQuery(api.plaid.listLinkedPlaidItems) ?? [];
  const createTransaction = useMutation(api.transactions.create);
  const updateCategory = useMutation(api.transactions.updateCategory);
  const syncPlaidTransactions = useAction(api.plaid.syncPlaidTransactions);

  const [modalVisible, setModalVisible] = useState(false);
  const [importPickerVisible, setImportPickerVisible] = useState(false);
  const [detailTxn, setDetailTxn] = useState<TxnWithAccount | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImportItemIds, setSelectedImportItemIds] = useState<Id<'plaidItems'>[]>([]);
  const [accountId, setAccountId] = useState<Id<'accounts'> | ''>('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<Id<'budgetCategories'> | ''>('');
  const [txnDate, setTxnDate] = useState(todayDate);
  const [isExpense, setIsExpense] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<Id<'budgetCategories'> | 'all'>('all');
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
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(txnDate) ? txnDate : todayDate();
    try {
      await createTransaction({
        accountId,
        amount: finalCents,
        date: dateStr,
        merchantName: merchant.trim(),
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
      });
      setAmount('');
      setMerchant('');
      setNotes('');
      setCategoryId('');
      setTxnDate(todayDate());
      setModalVisible(false);
      Toast.show({ type: 'success', text1: 'Transaction added' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const handleUpdateCategory = async (txnId: Id<'transactions'>, newCategoryId: Id<'budgetCategories'> | undefined) => {
    try {
      await updateCategory({ id: txnId, categoryId: newCategoryId });
      setDetailTxn((prev) => (prev ? { ...prev, categoryId: newCategoryId } : null));
      Toast.show({ type: 'success', text1: 'Category updated' });
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
      <Pressable
        style={({ pressed }) => [ledgerRow, styles.txnRow, pressed && styles.txnRowPressed]}
        onPress={() => setDetailTxn(t)}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ledgerText(), { fontSize: 15 }]} numberOfLines={1}>
            {t.merchantName}
          </Text>
          {subtitle && (
            <Text style={[ledgerDim(), { fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.txnRight}>
          <Text
            style={[
              ledgerText({ fontSize: 14 }),
              { color: isOutflow ? '#DC2626' : accent, marginLeft: spacing.sm },
            ]}
          >
            {formatCurrency(t.amount, { signed: true })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={accentDim} style={{ marginLeft: spacing.xs }} />
        </View>
      </Pressable>
    );
  };

  const listEmpty = (
    <View style={[ledgerEmpty, styles.emptyState]}>
      <Text style={[ledgerDim(), { fontSize: 15, textAlign: 'center', marginBottom: spacing.lg }]}>
        No transactions yet. Add one manually or import from your bank.
      </Text>
      <View style={styles.emptyActions}>
        <Pressable
          style={({ pressed }) => [ledgerBtn, styles.emptyBtn, pressed && { opacity: 0.7 }]}
          onPress={() => { setTxnDate(todayDate()); setModalVisible(true); }}
        >
          <Text style={ledgerText({ fontSize: 13 })}>+ Add transaction</Text>
        </Pressable>
        {hasPlaidAccounts && (
          <Pressable
            style={({ pressed }) => [ledgerBtn, styles.emptyBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setImportPickerVisible(true)}
            disabled={syncing}
          >
            <Text style={ledgerText({ fontSize: 13 })}>{syncing ? 'Importing…' : 'Import from bank'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const listHeader =
    transactions.length > 0 ? (
      <View style={[ledgerSection, styles.listHeader]}>
        <View style={[styles.searchWrap, { borderColor: accentDim + '80' }]}>
          <Ionicons name="search" size={18} color={accentDim} style={styles.searchIcon} />
          <Input
            placeholder="Search merchant or notes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { backgroundColor: 'transparent', marginBottom: 0, color: accent }]}
            placeholderTextColor={accentDim + 'aa'}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
          style={styles.filterScroll}
        >
          <Pressable
            style={({ pressed }) => [
              styles.filterChip,
              { borderColor: filterCategoryId === 'all' ? accent : accentDim + '60' },
              filterCategoryId === 'all' && { backgroundColor: accent + '22' },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setFilterCategoryId('all')}
          >
            <Text style={[filterCategoryId === 'all' ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })]}>All</Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c._id}
              style={({ pressed }) => [
                styles.filterChip,
                { borderColor: filterCategoryId === c._id ? accent : accentDim + '60' },
                filterCategoryId === c._id && { backgroundColor: accent + '22' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setFilterCategoryId(c._id)}
            >
              <Text style={[filterCategoryId === c._id ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })]} numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
              onPress={() => { setTxnDate(todayDate()); setModalVisible(true); }}
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
                tintColor={accentDim}
              />
            }
          />
        )}
      </View>

      {/* Transaction detail modal */}
      <Modal visible={!!detailTxn} animationType="slide" transparent>
        {detailTxn && (
          <View style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}>
            <View style={[styles.ledgerModalWrap, { paddingTop: insets.top }]}>
              <View style={[styles.ledgerModalCard, { borderColor: accentDim + '80' }]}>
                <View style={styles.ledgerModalHeader}>
                  <Text style={[ledgerText(), styles.ledgerModalTitle]}>Transaction</Text>
                  <Pressable onPress={() => setDetailTxn(null)} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                    <Ionicons name="close" size={24} color={accentDim} />
                  </Pressable>
                </View>
                <View style={[styles.modalTitleLine, { backgroundColor: accent }]} />
                <View style={[ledgerRow, styles.detailRow]}>
                  <Text style={ledgerDim({ fontSize: 12 })}>Merchant</Text>
                  <Text style={[ledgerText(), { fontSize: 15 }]} numberOfLines={1}>{detailTxn.merchantName}</Text>
                </View>
                <View style={[ledgerRow, styles.detailRow]}>
                  <Text style={ledgerDim({ fontSize: 12 })}>Amount</Text>
                  <Text style={[ledgerText(), { fontSize: 16, color: detailTxn.amount < 0 ? '#DC2626' : accent }]}>
                    {formatCurrency(detailTxn.amount, { signed: true })}
                  </Text>
                </View>
                <View style={[ledgerRow, styles.detailRow]}>
                  <Text style={ledgerDim({ fontSize: 12 })}>Date</Text>
                  <Text style={ledgerText({ fontSize: 14 })}>{formatDateLong(detailTxn.date)}</Text>
                </View>
                {detailTxn.account && (
                  <View style={[ledgerRow, styles.detailRow]}>
                    <Text style={ledgerDim({ fontSize: 12 })}>Account</Text>
                    <Text style={ledgerText({ fontSize: 14 })}>{detailTxn.account.name}</Text>
                  </View>
                )}
                {detailTxn.notes && (
                  <View style={[ledgerRow, styles.detailRow]}>
                    <Text style={ledgerDim({ fontSize: 12 })}>Notes</Text>
                    <Text style={ledgerText({ fontSize: 14 })} numberOfLines={2}>{detailTxn.notes}</Text>
                  </View>
                )}
                <Text style={[ledgerDim(), ledgerSectionLabel, { marginTop: spacing.lg }]}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detailChipRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.detailChip,
                      { borderColor: !detailTxn.categoryId ? accent : accentDim + '60' },
                      !detailTxn.categoryId && { backgroundColor: accent + '22' },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => handleUpdateCategory(detailTxn._id, undefined)}
                  >
                    <Text style={!detailTxn.categoryId ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })}>None</Text>
                  </Pressable>
                  {categories.map((c) => (
                    <Pressable
                      key={c._id}
                      style={({ pressed }) => [
                        styles.detailChip,
                        { borderColor: detailTxn.categoryId === c._id ? accent : accentDim + '60' },
                        detailTxn.categoryId === c._id && { backgroundColor: accent + '22' },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handleUpdateCategory(detailTxn._id, c._id)}
                    >
                      <Text style={detailTxn.categoryId === c._id ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Import from bank modal */}
      <Modal visible={importPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}>
          <View style={[styles.ledgerModalWrap, { paddingTop: insets.top }]}>
            <View style={[styles.ledgerModalCard, { borderColor: accentDim + '80' }]}>
              <View style={styles.ledgerModalHeader}>
                <Text style={[ledgerText(), styles.ledgerModalTitle]}>Import from bank</Text>
                <Pressable onPress={() => setImportPickerVisible(false)} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                  <Text style={ledgerText({ fontSize: 14 })}>Cancel</Text>
                </Pressable>
              </View>
              <View style={[styles.modalTitleLine, { backgroundColor: accent }]} />
              {linkedPlaidItems.length === 0 ? (
                <Text style={[ledgerDim(), { fontSize: 14 }]}>
                  No linked banks. Link an account in the Accounts tab first.
                </Text>
              ) : (
                <>
                  <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.sm }]}>
                    CHOOSE ACCOUNT(S) TO IMPORT FROM
                  </Text>
                  <View style={styles.chipRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.importChip,
                        { borderColor: syncAllBanks ? accent : accentDim + '60' },
                        syncAllBanks && { backgroundColor: accent + '22' },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setSelectedImportItemIds([])}
                    >
                      <Text style={syncAllBanks ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })}>All linked banks</Text>
                    </Pressable>
                    {linkedPlaidItems.map((item) => {
                      const selected = selectedImportItemIds.includes(item.itemId);
                      return (
                        <Pressable
                          key={item.itemId}
                          style={({ pressed }) => [
                            styles.importChip,
                            { borderColor: selected ? accent : accentDim + '60' },
                            selected && { backgroundColor: accent + '22' },
                            pressed && { opacity: 0.8 },
                          ]}
                          onPress={() => toggleImportItem(item.itemId)}
                        >
                          <Text style={selected ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })} numberOfLines={1}>
                            {item.institutionName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    onPress={runImport}
                    disabled={syncing}
                    style={({ pressed }) => [
                      styles.ledgerPrimaryBtn,
                      { backgroundColor: accent },
                      (syncing || pressed) && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.ledgerPrimaryBtnText}>{syncing ? 'Importing…' : 'Import'}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Add transaction modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: LEDGER_BG }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.ledgerModalWrap, { paddingTop: insets.top, flex: 1 }]}>
            <View style={[styles.ledgerModalCard, styles.addModalCard, { borderColor: accentDim + '80' }]}>
              <View style={styles.ledgerModalHeader}>
                <Text style={[ledgerText(), styles.ledgerModalTitle]}>Add transaction</Text>
                <Pressable onPress={() => setModalVisible(false)} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                  <Text style={ledgerText({ fontSize: 14 })}>Cancel</Text>
                </Pressable>
              </View>
              <View style={[styles.modalTitleLine, { backgroundColor: accent }]} />
              <ScrollView
                style={styles.addModalScroll}
                contentContainerStyle={styles.addModalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Input
                  placeholder="Merchant or payee"
                  value={merchant}
                  onChangeText={setMerchant}
                  style={[styles.ledgerInput, { borderColor: accentDim + '80' }]}
                  placeholderTextColor={accentDim + 'aa'}
                />
                <Input
                  placeholder="Amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  style={[styles.ledgerInput, { borderColor: accentDim + '80' }]}
                  placeholderTextColor={accentDim + 'aa'}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.toggleRow,
                    { borderColor: accentDim + '60' },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setIsExpense(!isExpense)}
                >
                  <Text style={ledgerText({ fontSize: 14 })}>
                    {isExpense ? 'Expense (money out)' : 'Income (money in)'}
                  </Text>
                  <Ionicons name={isExpense ? 'arrow-up-circle' : 'arrow-down-circle'} size={22} color={accent} />
                </Pressable>
                <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.xs }]}>DATE</Text>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={txnDate}
                  onChangeText={setTxnDate}
                  style={[styles.ledgerInput, { borderColor: accentDim + '80' }]}
                  placeholderTextColor={accentDim + 'aa'}
                />
                <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.xs, marginTop: spacing.lg }]}>ACCOUNT</Text>
                <View style={styles.chipRow}>
                  {accounts.map((a) => (
                    <Pressable
                      key={a._id}
                      style={({ pressed }) => [
                        styles.importChip,
                        { borderColor: accountId === a._id ? accent : accentDim + '60' },
                        accountId === a._id && { backgroundColor: accent + '22' },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setAccountId(a._id)}
                    >
                      <Text style={accountId === a._id ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })} numberOfLines={1}>
                        {a.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {categories.length > 0 && (
                  <>
                    <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.xs, marginTop: spacing.lg }]}>
                      CATEGORY (OPTIONAL)
                    </Text>
                    <View style={styles.chipRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.importChip,
                          { borderColor: !categoryId ? accent : accentDim + '60' },
                          !categoryId && { backgroundColor: accent + '22' },
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => setCategoryId('')}
                      >
                        <Text style={!categoryId ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })}>None</Text>
                      </Pressable>
                      {categories.map((c) => (
                        <Pressable
                          key={c._id}
                          style={({ pressed }) => [
                            styles.importChip,
                            { borderColor: categoryId === c._id ? accent : accentDim + '60' },
                            categoryId === c._id && { backgroundColor: accent + '22' },
                            pressed && { opacity: 0.8 },
                          ]}
                          onPress={() => setCategoryId(c._id)}
                        >
                          <Text style={categoryId === c._id ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })} numberOfLines={1}>
                            {c.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  style={[styles.ledgerInput, { borderColor: accentDim + '80' }]}
                  placeholderTextColor={accentDim + 'aa'}
                />
                <Pressable
                  onPress={handleSubmit}
                  disabled={!accountId || !merchant.trim()}
                  style={({ pressed }) => [
                    styles.ledgerPrimaryBtn,
                    { backgroundColor: accent },
                    (!accountId || !merchant.trim()) && { opacity: 0.5 },
                    pressed && accountId && merchant.trim() && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.ledgerPrimaryBtnText}>Save transaction</Text>
                </Pressable>
              </ScrollView>
            </View>
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
  txnRow: { paddingVertical: spacing.lg },
  txnRowPressed: { opacity: 0.85 },
  txnRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listHeader: { paddingTop: spacing.lg },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1 },
  filterScroll: { marginHorizontal: -spacing.lg },
  filterChipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  emptyContainer: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  emptyState: { paddingTop: spacing.xxl * 2 },
  emptyActions: { gap: spacing.md, alignItems: 'center' },
  emptyBtn: { minWidth: 200 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  ledgerModalWrap: { flex: 1, maxWidth: 440, width: '100%', alignSelf: 'center' },
  ledgerModalCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  addModalCard: { flex: 1, minHeight: 0 },
  ledgerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerModalTitle: { fontSize: 18, letterSpacing: 0.5 },
  modalTitleLine: { height: 1, opacity: 0.5, marginBottom: spacing.lg },
  detailRow: { paddingVertical: spacing.sm },
  detailChipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingBottom: spacing.sm },
  detailChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  importChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  ledgerPrimaryBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radii.md,
    width: '100%',
  },
  ledgerPrimaryBtnText: { fontFamily: LEDGER_FONT, fontSize: 16, fontWeight: '500', color: '#fff' },
  ledgerInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  addModalScroll: { flex: 1 },
  addModalScrollContent: { paddingBottom: spacing.xxl },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
});
