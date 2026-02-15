import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../../lib/theme-context';
import { spacing } from '../../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerHeaderRow,
  ledgerBtn,
  ledgerSummaryRow,
  ledgerSection,
  ledgerRow,
  ledgerEmpty,
} from '../../lib/ledger-theme';
import { formatCurrency, formatCurrencyOrHide } from '../../lib/format';
import { useHideAmounts } from '../../lib/hide-amounts-context';
import { Text, Button } from '../../components';
import Toast from 'react-native-toast-message';

export default function NetWorthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hideAmounts } = useHideAmounts();
  const { colors } = useTheme();
  const summary = useQuery(api.networth.getSummary);
  const snapshots = useQuery(api.networth.getSnapshotHistory, { limit: 14 });
  const saveSnapshot = useMutation(api.networth.saveSnapshot);

  const [saving, setSaving] = useState(false);

  const totalAssets = summary?.totalAssets ?? 0;
  const totalLiabilities = summary?.totalLiabilities ?? 0;
  const netWorth = summary?.netWorth ?? 0;
  const assetAccounts = summary?.assetAccounts ?? [];
  const debtAccountsRaw = summary?.debtAccounts ?? [];
  const debtAccounts = [...debtAccountsRaw].sort((a, b) => (b.interestRate ?? -1) - (a.interestRate ?? -1));

  const handleSaveSnapshot = async () => {
    setSaving(true);
    try {
      await saveSnapshot();
      Toast.show({ type: 'success', text1: 'Snapshot saved' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <View style={ledgerHeaderRow}>
            <View>
              <Text style={[ledgerText(), { fontSize: 16, letterSpacing: 1 }]}>NET WORTH</Text>
              <Text style={[ledgerDim(), { fontSize: 12, marginTop: 2 }]}>
                Assets minus liabilities
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}
              onPress={handleSaveSnapshot}
              disabled={saving}
            >
              <Text style={ledgerText({ fontSize: 12 })}>{saving ? '…' : 'SNAPSHOT'}</Text>
            </Pressable>
          </View>
          <View style={[ledgerLine, { marginTop: spacing.lg }]} />
          <View style={ledgerSummaryRow}>
            <Text style={ledgerDim({ fontSize: 12 })}>TOTAL</Text>
            <Text
              style={[
                ledgerText(),
                { fontSize: 16, color: netWorth >= 0 ? '#B91C1C' : '#DC2626' },
              ]}
            >
              {formatCurrencyOrHide(netWorth, hideAmounts)}
            </Text>
          </View>
          <View style={ledgerLine} />
          <View style={[ledgerRow, { paddingVertical: spacing.xs }]}>
            <Text style={ledgerDim({ fontSize: 12 })}>Assets</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrencyOrHide(totalAssets, hideAmounts)}</Text>
          </View>
          <View style={[ledgerRow, { paddingVertical: spacing.xs }]}>
            <Text style={ledgerDim({ fontSize: 12 })}>Liabilities</Text>
            <Text style={ledgerText({ fontSize: 14 })}>{formatCurrencyOrHide(totalLiabilities, hideAmounts)}</Text>
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>ASSETS</Text>
          <View style={ledgerLine} />
          {assetAccounts.length === 0 ? (
            <View style={ledgerEmpty}>
              <Text style={ledgerDim({ fontSize: 14 })}>
                No asset accounts. Add checking, savings, or investment in Accounts.
              </Text>
              <Button onPress={() => router.push('/(tabs)/accounts')} style={styles.topMargin}>
                Add account
              </Button>
            </View>
          ) : (
            <>
              {assetAccounts.map((acc) => (
                <Pressable
                  key={acc._id}
                  style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push('/(tabs)/accounts')}
                >
                  <Text style={[ledgerText(), { fontSize: 14, flex: 1 }]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={ledgerText({ fontSize: 14 })}>
                    {formatCurrencyOrHide(acc.currentBalance, hideAmounts)}
                  </Text>
                </Pressable>
              ))}
              <View style={ledgerLine} />
            </>
          )}
        </View>

        <View style={ledgerSection}>
          <View style={ledgerHeaderRow}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>DEBT</Text>
            {debtAccounts.length > 0 && (
              <Pressable
                onPress={() => router.push('/debt-plan')}
                style={({ pressed }) => [ledgerBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={ledgerText({ fontSize: 11 })}>DEBT PLAN</Text>
              </Pressable>
            )}
          </View>
          <View style={ledgerLine} />
          {debtAccounts.length === 0 ? (
            <View style={ledgerEmpty}>
              <Text style={ledgerDim({ fontSize: 14 })}>
                No debt accounts. Add credit cards or loans in Accounts.
              </Text>
              <Button onPress={() => router.push('/(tabs)/accounts')} style={styles.topMargin}>
                Add account
              </Button>
            </View>
          ) : (
            <>
              {debtAccounts.map((acc) => (
                <Pressable
                  key={acc._id}
                  style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push(`/(tabs)/accounts/${acc._id}`)}
                >
                  <Text style={[ledgerText(), { fontSize: 14, flex: 1 }]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={ledgerText({ fontSize: 14 })}>
                    {formatCurrencyOrHide(acc.currentBalance, hideAmounts)}
                  </Text>
                </Pressable>
              ))}
              <View style={ledgerLine} />
            </>
          )}
        </View>

        {snapshots && snapshots.length > 0 && (
          <View style={ledgerSection}>
            <Text style={[ledgerDim(), styles.sectionLabel]}>HISTORY</Text>
            <View style={ledgerLine} />
            {snapshots.map((s) => (
              <View key={s._id} style={ledgerRow}>
                <Text style={ledgerDim({ fontSize: 14 })}>{s.date}</Text>
                <Text
                  style={[
                    ledgerText({ fontSize: 14 }),
                    s.netWorth < 0 && { color: '#DC2626' },
                  ]}
                >
                  {formatCurrencyOrHide(s.netWorth, hideAmounts)}
                </Text>
              </View>
            ))}
            <View style={ledgerLine} />
          </View>
        )}

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  topMargin: { marginTop: spacing.md },
});
