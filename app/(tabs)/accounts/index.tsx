import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, KeyboardAvoidingView, Platform, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id, Doc } from '../../../convex/_generated/dataModel';
import { useTheme } from '../../../lib/theme-context';
import { spacing, radii } from '../../../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerHeaderRow,
  ledgerBtn,
  ledgerSummaryRow,
  ledgerEmpty,
  ledgerSection,
  ledgerRow,
} from '../../../lib/ledger-theme';
import { formatCurrency, formatCurrencyOrHide, parseAmountToCents, parsePaymentDueDate } from '../../../lib/format';
import { useHideAmounts } from '../../../lib/hide-amounts-context';
import { Text, Button, Input } from '../../../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const ACCOUNT_TYPES = [
  { type: 'depository', subtype: 'checking', label: 'Checking', icon: 'wallet-outline' as const },
  { type: 'depository', subtype: 'savings', label: 'Savings', icon: 'trending-up-outline' as const },
  { type: 'credit', subtype: 'credit card', label: 'Credit card', icon: 'card-outline' as const },
  { type: 'loan', subtype: 'loan', label: 'Loan', icon: 'cash-outline' as const },
];

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hideAmounts } = useHideAmounts();
  const { colors, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const accounts = useQuery(api.accounts.list) ?? [];
  const createAccount = useMutation(api.accounts.create);
  const updateBalance = useMutation(api.accounts.updateBalance);
  const updateAccount = useMutation(api.accounts.update);
  const removeAccount = useMutation(api.accounts.remove);
  const createLinkToken = useAction(api.plaid.createLinkToken);
  const exchangePublicToken = useAction(api.plaid.exchangePublicToken);
  const refreshPlaidBalancesAndLiabilities = useAction(api.plaid.refreshPlaidBalancesAndLiabilities);
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl);
  const extractAccountFromStatement = useAction(api.statementExtract.extractAccountFromStatement);

  const [showAdd, setShowAdd] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [plaidLinking, setPlaidLinking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractPhase, setExtractPhase] = useState<'idle' | 'uploading' | 'extracting'>('idle');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [selectedType, setSelectedType] = useState(ACCOUNT_TYPES[0]);
  const [reconcileAccount, setReconcileAccount] = useState<Doc<'accounts'> | null>(null);
  const [reconcileBalance, setReconcileBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [editDebtAccount, setEditDebtAccount] = useState<Doc<'accounts'> | null>(null);
  const [editRate, setEditRate] = useState('');
  const [editMinPay, setEditMinPay] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const isDebtAccount = selectedType.type === 'credit' || selectedType.type === 'loan';

  const balancePlaceholder = isDebtAccount
    ? 'Amount you owe (e.g. 500.00)'
    : 'Current balance (e.g. 1500.00)';

  const applyExtracted = (extracted: {
    accountName: string | null;
    balance: number | null;
    amountOwed: number | null;
    type: 'checking' | 'savings' | 'credit card' | 'loan' | null;
    interestRate: number | null;
    minimumPayment: number | null;
  }) => {
    if (extracted.accountName?.trim()) setName(extracted.accountName.trim());
    const amt = extracted.balance ?? extracted.amountOwed ?? null;
    if (amt != null) setBalance(amt.toFixed(2));
    if (extracted.type) {
      const t = ACCOUNT_TYPES.find((x) => x.subtype === extracted.type || (extracted.type === 'credit card' && x.subtype === 'credit card'));
      if (t) setSelectedType(t);
    }
    if (extracted.interestRate != null) setInterestRate(String(Math.round(extracted.interestRate)));
    if (extracted.minimumPayment != null) setMinimumPayment(extracted.minimumPayment.toFixed(2));
    setShowManualEntry(true);
  };

  const showPdfNotSupportedAlert = () => {
    Alert.alert(
      'PDF not supported yet',
      'We can\'t read account details from PDFs yet. To add an account from a statement:\n\n• Take a screenshot of the page that shows the account name and balance (or amount owed).\n• Come back here and tap "Upload screenshot or statement" → "Choose from library" and select that screenshot.',
      [{ text: 'Got it' }]
    );
  };

  const uploadAndExtract = async (fileUri: string, mimeType: string) => {
    setExtracting(true);
    setExtractPhase('uploading');
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const postRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': mimeType || blob.type || 'image/jpeg' },
        body: blob,
      });
      if (!postRes.ok) throw new Error('Upload failed');
      const { storageId } = (await postRes.json()) as { storageId: string };
      setExtractPhase('extracting');
      const extracted = await extractAccountFromStatement({ storageId: storageId as Id<'_storage'> });
      applyExtracted(extracted);
      Toast.show({ type: 'success', text1: 'Details extracted — review and save' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('pdf') || msg.includes('screenshot')) {
        showPdfNotSupportedAlert();
      } else {
        Toast.show({ type: 'error', text1: msg || 'Extraction failed' });
      }
    } finally {
      setExtracting(false);
      setExtractPhase('idle');
    }
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cents = parseAmountToCents(balance || '0');
    const rate = interestRate.trim() ? parseFloat(interestRate) / 100 : undefined;
    const minPay = minimumPayment.trim() ? parseAmountToCents(minimumPayment) : undefined;
    const dueDate = isDebtAccount ? parsePaymentDueDate(paymentDueDate) : undefined;
    try {
      await createAccount({
        name: trimmed,
        type: selectedType.type,
        subtype: selectedType.subtype,
        currentBalance: cents,
        isOnBudget: true,
        ...(isDebtAccount && rate !== undefined && !Number.isNaN(rate) && { interestRate: rate }),
        ...(isDebtAccount && minPay !== undefined && { minimumPayment: minPay }),
        ...(isDebtAccount && dueDate && { nextPaymentDueDate: dueDate }),
      });
      setName('');
      setBalance('');
      setInterestRate('');
      setMinimumPayment('');
      setPaymentDueDate('');
      setShowAdd(false);
      setShowManualEntry(false);
      Toast.show({ type: 'success', text1: 'Account added' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const handleDelete = (id: Id<'accounts'>, accountName: string) => {
    Alert.alert('Delete account', `Remove "${accountName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeAccount({ id });
            Toast.show({ type: 'success', text1: 'Account removed' });
          } catch (e) {
            Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
          }
        },
      },
    ]);
  };

  const handleReconcile = () => {
    if (!reconcileAccount) return;
    const cents = parseAmountToCents(reconcileBalance || '0');
    try {
      updateBalance({
        id: reconcileAccount._id,
        currentBalance: cents,
        availableBalance: cents,
      });
      setReconcileAccount(null);
      setReconcileBalance('');
      Toast.show({ type: 'success', text1: 'Balance updated' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const reconcileDiff = reconcileAccount
    ? reconcileAccount.currentBalance - parseAmountToCents(reconcileBalance || '0')
    : 0;

  const assets = accounts.filter((a) => a.type === 'depository' || a.type === 'investment');
  const debts = accounts.filter((a) => a.type === 'credit' || a.type === 'loan');
  const totalAssets = assets.reduce((s, a) => s + a.currentBalance, 0);
  const totalDebts = debts.reduce((s, a) => s + a.currentBalance, 0);
  const netWorth = totalAssets - totalDebts;

  const handleSaveDebtDetails = async () => {
    if (!editDebtAccount) return;
    const rate = editRate.trim() ? parseFloat(editRate) / 100 : undefined;
    const minPay = editMinPay.trim() ? parseAmountToCents(editMinPay) : undefined;
    const dueDate = editDueDate.trim() ? parsePaymentDueDate(editDueDate) : undefined;
    try {
      await updateAccount({
        id: editDebtAccount._id,
        interestRate: rate,
        minimumPayment: minPay,
        nextPaymentDueDate: editDueDate.trim() === '' ? '' : dueDate,
      });
      setEditDebtAccount(null);
      setEditRate('');
      setEditMinPay('');
      setEditDueDate('');
      Toast.show({ type: 'success', text1: 'Updated' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <View style={ledgerHeaderRow}>
            <View>
              <Text style={[ledgerText(), { fontSize: 16, letterSpacing: 1 }]}>ACCOUNTS</Text>
              <Text style={[ledgerDim(), { fontSize: 12, marginTop: 2 }]}>Balances and net worth</Text>
            </View>
            <View style={styles.headerActions}>
              {accounts.some((a) => a.plaidItemId) && (
                <Pressable
                  style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}
                  onPress={async () => {
                    setRefreshing(true);
                    try {
                      const result = await refreshPlaidBalancesAndLiabilities();
                      Toast.show({
                        type: result.updated > 0 ? 'success' : 'info',
                        text1: result.updated > 0 ? result.message : (result as { message?: string }).message ?? 'Up to date',
                      });
                    } catch (e) {
                      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Refresh failed' });
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing}
                >
                  <Text style={ledgerText({ fontSize: 12 })}>REFRESH</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setShowAdd(true)}
              >
                <Text style={ledgerText({ fontSize: 12 })}>+ ADD</Text>
              </Pressable>
            </View>
          </View>
          <View style={[ledgerLine, { marginTop: spacing.lg }]} />
          {accounts.length > 0 && (
            <>
              <View style={ledgerSummaryRow}>
                <Text style={ledgerDim({ fontSize: 12 })}>NET WORTH</Text>
                <Text style={[ledgerText(), { fontSize: 16 }]}>
                  {formatCurrencyOrHide(netWorth, hideAmounts, { signed: netWorth !== 0 })}
                </Text>
              </View>
              <View style={ledgerLine} />
            </>
          )}
        </View>

        {accounts.length === 0 && !showAdd ? (
          <View style={ledgerEmpty}>
            <Text style={ledgerDim({ fontSize: 14 })}>No accounts yet. Add one or link a bank.</Text>
            <Pressable style={({ pressed }) => [ledgerBtn, { marginTop: spacing.lg }, pressed && { opacity: 0.7 }]} onPress={() => setShowAdd(true)}>
              <Text style={ledgerText({ fontSize: 12 })}>+ ADD ACCOUNT</Text>
            </Pressable>
          </View>
        ) : (
          <View style={ledgerSection}>
            {assets.length > 0 && (
              <>
                <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginBottom: spacing.sm }]}>ASSETS</Text>
                <View style={ledgerLine} />
                {assets.map((acc) => (
                  <Pressable
                    key={acc._id}
                    style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push(`/(tabs)/accounts/${acc._id}`)}
                  >
                    <Text style={[ledgerText(), { fontSize: 14, flex: 1 }]} numberOfLines={1}>{acc.name}</Text>
                    <Text style={ledgerText({ fontSize: 14 })}>{formatCurrencyOrHide(acc.currentBalance, hideAmounts)}</Text>
                  </Pressable>
                ))}
                <View style={ledgerLine} />
              </>
            )}

            {debts.length > 0 && (
              <>
                <Text style={[ledgerDim(), { fontSize: 11, letterSpacing: 1, marginTop: assets.length > 0 ? spacing.xl : 0, marginBottom: spacing.sm }]}>DEBT</Text>
                <View style={ledgerLine} />
                {debts.map((acc) => (
                  <Pressable
                    key={acc._id}
                    style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push(`/(tabs)/accounts/${acc._id}`)}
                  >
                    <Text style={[ledgerText(), { fontSize: 14, flex: 1 }]} numberOfLines={1}>{acc.name}</Text>
                    <Text style={ledgerText({ fontSize: 14 })}>{formatCurrencyOrHide(acc.currentBalance, hideAmounts)}</Text>
                  </Pressable>
                ))}
                <View style={ledgerLine} />
              </>
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>

      <Modal visible={!!reconcileAccount} animationType="slide" transparent>
        {reconcileAccount && (
          <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
            <View style={styles.modalCardWrap}>
              <View style={[styles.reconcileCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="sync-outline" size={28} color={colors.primary} />
                </View>
                <Text variant="cardTitle" style={{ color: colors.text, textAlign: 'center' }}>
                  Reconcile
                </Text>
                <Text variant="body" style={{ color: colors.text, textAlign: 'center' }} numberOfLines={1}>
                  {reconcileAccount.name}
                </Text>
                <Text variant="caption" style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.sm }}>
                  Enter the current balance shown in your bank or statement.
                </Text>
                <View style={[styles.balanceRow, { backgroundColor: colors.background }]}>
                  <Text variant="caption" style={{ color: colors.muted }}>App balance</Text>
                  <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
                    {formatCurrencyOrHide(reconcileAccount.currentBalance, hideAmounts)}
                  </Text>
                </View>
                <Input
                  placeholder="Bank balance (e.g. 1500.00)"
                  value={reconcileBalance}
                  onChangeText={setReconcileBalance}
                  keyboardType="decimal-pad"
                />
                {reconcileBalance.trim() !== '' && (
                  <View style={[styles.diffBadge, { backgroundColor: reconcileDiff === 0 ? colors.primary + '18' : colors.error + '18' }]}>
                    <Text variant="caption" style={{ color: reconcileDiff === 0 ? colors.primary : colors.error, fontWeight: '600' }}>
                      {reconcileDiff === 0
                        ? 'Balances match'
                        : `Difference: ${formatCurrencyOrHide(Math.abs(reconcileDiff), hideAmounts, { signed: true })}`}
                    </Text>
                  </View>
                )}
                <View style={styles.formActions}>
                  <Button onPress={handleReconcile}>Update balance</Button>
                  <Button variant="secondary" onPress={() => { setReconcileAccount(null); setReconcileBalance(''); }}>
                    Cancel
                  </Button>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>

      <Modal visible={!!editDebtAccount} animationType="slide" transparent>
        {editDebtAccount && (
          <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
            <View style={styles.modalCardWrap}>
              <View style={[styles.reconcileCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="card-outline" size={28} color={colors.primary} />
                </View>
                <Text variant="cardTitle" style={{ color: colors.text, textAlign: 'center' }}>
                  Debt details
                </Text>
                <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }} numberOfLines={1}>
                  {editDebtAccount.name}
                </Text>
                <Text variant="caption" style={[styles.formSectionLabel, { color: colors.muted, marginTop: spacing.xl }]}>
                  Optional
                </Text>
                <Input
                  placeholder="Interest rate % (e.g. 18)"
                  value={editRate}
                  onChangeText={setEditRate}
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Minimum payment $ (e.g. 50)"
                  value={editMinPay}
                  onChangeText={setEditMinPay}
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Payment due (e.g. 15 or 2026-02-15)"
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                />
                <View style={styles.formActions}>
                  <Button onPress={handleSaveDebtDetails}>Save</Button>
                  <Button variant="secondary" onPress={() => { setEditDebtAccount(null); setEditRate(''); setEditMinPay(''); setEditDueDate(''); }}>
                    Cancel
                  </Button>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Add account modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.md, borderBottomColor: colors.surface }]}>
            <Pressable
              onPress={() => { setShowAdd(false); setShowManualEntry(false); }}
              style={({ pressed }) => [styles.modalHeaderBtn, pressed && { opacity: 0.7 }]}
            >
              <Text variant="body" style={{ color: colors.primary }}>Cancel</Text>
            </Pressable>
            <View style={styles.modalHeaderCenter}>
              <Text variant="cardTitle" style={{ color: colors.text }}>New account</Text>
              <Text variant="caption" style={{ color: colors.muted, marginTop: 2 }}>Link bank or add manually</Text>
            </View>
            <Pressable
              onPress={handleAdd}
              disabled={!name.trim()}
              style={({ pressed }) => [styles.modalHeaderBtn, pressed && { opacity: 0.7 }, !name.trim() && { opacity: 0.5 }]}
            >
              <Text variant="body" style={{ color: name.trim() ? colors.primary : colors.muted, fontWeight: '600' }}>Save</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Connect with Plaid */}
            <Pressable
              disabled={plaidLinking}
              style={({ pressed }) => [
                styles.optionCard,
                styles.plaidCard,
                { backgroundColor: colors.primary + '0c', borderColor: colors.primary + '40' },
                (pressed || plaidLinking) && { opacity: 0.9 },
              ]}
              onPress={() => {
                setPlaidLinking(true);
                (async () => {
                  try {
                    if (Constants.appOwnership === 'expo') {
                      Alert.alert(
                        'Use a development build',
                        'Plaid Link only works in a development or production build. Expo Go doesn’t include the native Plaid module. Run "npx expo run:ios" (or run:android) to create a build where "Connect your bank" will open Plaid.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    const { linkToken } = await createLinkToken();
                    if (!linkToken) {
                      Toast.show({ type: 'error', text1: 'No link token received' });
                      return;
                    }
                    try {
                      const { create, open, dismissLink } = require('react-native-plaid-link-sdk');
                      create({ token: linkToken });
                      open({
                        onSuccess: async (success: { publicToken: string }) => {
                          dismissLink?.();
                          try {
                            await exchangePublicToken({ publicToken: success.publicToken });
                            setShowAdd(false);
                            setShowManualEntry(false);
                          Toast.show({ type: 'success', text1: 'Bank linked! Accounts added.' });
                          } catch (e) {
                            Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Exchange failed' });
                          }
                        },
                        onExit: () => {
                          dismissLink?.();
                        },
                      });
                    } catch (_sdkError) {
                      Alert.alert(
                        'Plaid is configured',
                        'Link token was created. For full bank linking in this app, install react-native-plaid-link-sdk and use a development build (Expo Go does not include the native Plaid module). See docs/PLAID_SETUP.md.',
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    if (msg.includes('not configured')) {
                      Alert.alert(
                        'Connect your bank',
                        'Add PLAID_CLIENT_ID and PLAID_SECRET in Convex Dashboard → Settings → Environment Variables. Use your sandbox secret for development. See docs/PLAID_ENV.md.',
                        [{ text: 'OK' }]
                      );
                    } else if (/invalid client_id|invalid secret|invalid client_id or secret/i.test(msg)) {
                      Alert.alert(
                        'Plaid credentials',
                        'For production: in Convex production deployment set PLAID_CLIENT_ID and PLAID_SECRET to your production keys, and set PLAID_BASE_URL to https://production.plaid.com. For dev use sandbox keys and leave PLAID_BASE_URL unset.',
                        [{ text: 'OK' }]
                      );
                    } else {
                      Toast.show({ type: 'error', text1: msg || 'Something went wrong' });
                    }
                  } finally {
                    setPlaidLinking(false);
                  }
                })();
              }}
            >
              <View style={[styles.optionCardIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="link" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
                  {plaidLinking ? 'Connecting…' : 'Connect your bank'}
                </Text>
                <Text variant="caption" style={{ color: colors.muted, marginTop: 2 }}>
                  {plaidLinking ? 'Opening Plaid…' : 'Link accounts securely with Plaid'}
                </Text>
              </View>
              {!plaidLinking && <Ionicons name="chevron-forward" size={20} color={colors.muted} />}
            </Pressable>

            {/* Apple Card — not via Plaid; native FinanceKit coming later (iOS only) */}
            {Platform.OS === 'ios' && (
              <View style={[styles.appleCardCard, { backgroundColor: colors.surface, borderColor: colors.background }]}>
                <View style={[styles.optionCardIcon, { backgroundColor: colors.text }]}>
                  <Ionicons name="card-outline" size={22} color={colors.surface} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
                    Apple Card
                  </Text>
                  <Text variant="caption" style={{ color: colors.muted, marginTop: 4 }}>
                    Apple Card is not available through Connect your bank (Plaid). We are working on adding it via Apple FinanceKit. For now you can add Apple Card as a manual account and track it here.
                  </Text>
                  <Pressable
                    onPress={() => Linking.openSettings()}
                    style={({ pressed }) => [
                      { marginTop: spacing.sm, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: radii.sm, backgroundColor: colors.primary + '20' },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>Open Settings</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable
              disabled={extracting}
              style={({ pressed }) => [
                styles.optionCard,
                styles.manualEntryCard,
                { backgroundColor: colors.surface, borderColor: colors.background },
                (pressed || extracting) && { opacity: 0.9 },
                extracting && { borderColor: colors.primary + '60' },
                { marginTop: spacing.md },
              ]}
              onPress={() => {
                const showImagePickerUnavailableAlert = (e?: unknown) => {
                  const isNativeModuleError =
                    e instanceof Error &&
                    (e.message.includes('Cannot find native module') ||
                      e.message.includes('ExponentImagePicker') ||
                      e.message.includes('Not available'));
                  Alert.alert(
                    'Image picker unavailable',
                    isNativeModuleError || !e
                      ? 'Upload works in a development build. Run "npx expo run:ios" (or run:android), then open that app and try again. It does not work in Expo Go.'
                      : e instanceof Error
                        ? e.message
                        : 'Something went wrong. Try a development build (npx expo run:ios).',
                    [{ text: 'OK' }]
                  );
                };
                if (Constants.appOwnership === 'expo') {
                  showImagePickerUnavailableAlert();
                  return;
                }
                Alert.alert(
                  'Upload screenshot or statement',
                  'We’ll extract account name and balance from an image.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Take photo',
                      onPress: async () => {
                        try {
                          const ImagePicker = require('expo-image-picker');
                          if (!ImagePicker || typeof ImagePicker.requestCameraPermissionsAsync !== 'function') throw new Error('Not available');
                          const { status } = await ImagePicker.requestCameraPermissionsAsync();
                          if (status !== 'granted') {
                            Toast.show({ type: 'error', text1: 'Camera permission required' });
                            return;
                          }
                          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
                          if (result.canceled || !result.assets[0]?.uri) return;
                          await uploadAndExtract(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
                        } catch (err) {
                          showImagePickerUnavailableAlert(err);
                        }
                      },
                    },
                    {
                      text: 'Choose from library',
                      onPress: async () => {
                        try {
                          const ImagePicker = require('expo-image-picker');
                          if (!ImagePicker || typeof ImagePicker.launchImageLibraryAsync !== 'function') throw new Error('Not available');
                          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                          if (result.canceled || !result.assets[0]?.uri) return;
                          await uploadAndExtract(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
                        } catch (err) {
                          showImagePickerUnavailableAlert(err);
                        }
                      },
                    },
                    {
                      text: 'Choose file (PDF/image)',
                      onPress: async () => {
                        try {
                          const DocumentPicker = require('expo-document-picker');
                          if (!DocumentPicker || typeof DocumentPicker.getDocumentAsync !== 'function') throw new Error('Not available');
                          const result = await DocumentPicker.getDocumentAsync({
                            type: ['image/*', 'application/pdf'],
                            copyToCacheDirectory: true,
                          });
                          if (result.canceled) return;
                          const file = result.assets[0];
                          if (file.mimeType?.includes('pdf')) {
                            showPdfNotSupportedAlert();
                            return;
                          }
                          await uploadAndExtract(file.uri, file.mimeType ?? 'image/jpeg');
                        } catch (err) {
                          showImagePickerUnavailableAlert(err);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              {extracting ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
              ) : (
                <View style={[styles.optionCardIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ color: colors.text, fontWeight: '500' }}>
                  {extracting
                    ? (extractPhase === 'uploading' ? 'Uploading…' : 'Extracting…')
                    : 'Upload screenshot or statement'}
                </Text>
                <Text variant="caption" style={{ color: colors.muted, marginTop: 2 }}>
                  {extracting ? (extractPhase === 'uploading' ? 'Sending your image…' : 'Reading account name and balance…') : 'We’ll fill in the details for you'}
                </Text>
              </View>
              {!extracting && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
            </Pressable>

            {!showManualEntry ? (
              <Pressable
                onPress={() => setShowManualEntry(true)}
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.manualEntryCard,
                  { backgroundColor: colors.surface, borderColor: colors.background },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={[styles.optionCardIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name="create-outline" size={22} color={colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ color: colors.text, fontWeight: '500' }}>Add account manually</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ) : (
              <>
                <View style={styles.orDivider}>
                  <View style={[styles.orLine, { backgroundColor: colors.background }]} />
                  <Text variant="caption" style={{ color: colors.muted, paddingHorizontal: spacing.md }}>or add manually</Text>
                  <View style={[styles.orLine, { backgroundColor: colors.background }]} />
                </View>

                <View style={[styles.formBlock, { backgroundColor: colors.surface }]}>
              <Text variant="caption" style={[styles.formSectionLabel, { color: colors.muted }]}>Details</Text>
              <Input placeholder="Account name (e.g. Chase Checking)" value={name} onChangeText={setName} />
              <Input
                placeholder={balancePlaceholder}
                value={balance}
                onChangeText={setBalance}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.formBlock, { backgroundColor: colors.surface }]}>
              <Text variant="caption" style={[styles.formSectionLabel, { color: colors.muted }]}>Type</Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map((t) => {
                  const selected = selectedType.subtype === t.subtype;
                  return (
                    <Pressable
                      key={t.subtype}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor: selected ? colors.primary : colors.background,
                          borderWidth: 2,
                          borderColor: selected ? colors.primary : colors.background,
                        },
                      ]}
                      onPress={() => setSelectedType(t)}
                    >
                      <Ionicons name={t.icon} size={26} color={selected ? '#fff' : colors.primary} />
                      <Text variant="caption" style={{ color: selected ? '#fff' : colors.text, fontWeight: '500', marginTop: 6 }}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {isDebtAccount && (
              <View style={[styles.formBlock, { backgroundColor: colors.surface }]}>
                <Text variant="caption" style={[styles.formSectionLabel, { color: colors.muted }]}>Debt details (optional)</Text>
                <Input
                  placeholder="Interest rate % (e.g. 18)"
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Minimum payment $ per month (e.g. 50)"
                  value={minimumPayment}
                  onChangeText={setMinimumPayment}
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Payment due (e.g. 15 or 2026-02-15)"
                  value={paymentDueDate}
                  onChangeText={setPaymentDueDate}
                />
              </View>
            )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1, backgroundColor: LEDGER_BG },
  scrollContent: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    gap: spacing.sm,
  },
  accountActionsCardWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  accountActionsCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
  },
  accountActionsModal: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  actionPillFull: {
    width: '100%',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topMargin: { marginTop: spacing.sm },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  modalHeaderBtn: { padding: spacing.sm, minWidth: 64 },
  modalHeaderCenter: { alignItems: 'center' },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  optionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plaidCard: {},
  manualEntryCard: { marginTop: spacing.md },
  appleCardCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  orLine: { flex: 1, height: 1 },
  formBlock: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  formSectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    fontSize: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    width: '47%',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  checkboxLarge: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
  },
  formActions: { gap: spacing.sm },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCardWrap: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  diffBadge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reconcileCard: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
