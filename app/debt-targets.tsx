import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { spacing } from '../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerSection,
  ledgerRow,
  ledgerBtn,
  ledgerEmpty,
} from '../lib/ledger-theme';
import { formatCurrency } from '../lib/format';
import { Text, BackHeader } from '../components';

export default function DebtTargetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const order = useQuery(api.debt.getDebtPayoffOrder) ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <BackHeader title="Payoff order" subtitle="Highest APR first" onBack={() => router.back()} variant="ledger" />
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>STRATEGY</Text>
          <View style={ledgerLine} />
          <View style={ledgerEmpty}>
            <Text style={ledgerDim({ fontSize: 14 })}>
              Attack the highest-interest debt first. Put every extra dollar there until it&apos;s paid off, then roll that payment to the next.
            </Text>
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>ORDER</Text>
          <View style={ledgerLine} />
          {order.length === 0 ? (
            <>
              <View style={ledgerEmpty}>
                <Text style={ledgerDim({ fontSize: 14 })}>
                  No debt with a balance. Add credit cards or loans in Accounts.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [ledgerBtn, { marginTop: spacing.md }, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/(tabs)/accounts')}
              >
                <Text style={ledgerText({ fontSize: 12 })}>ACCOUNTS</Text>
              </Pressable>
              <View style={ledgerLine} />
            </>
          ) : (
            <>
              {order.map((acc, index) => {
                const isFirst = index === 0;
                const rankLabel = isFirst ? 'PAY FIRST' : `#${index + 1}`;
                return (
                  <Pressable
                    key={acc._id}
                    style={({ pressed }) => [ledgerRow, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push(`/(tabs)/accounts/${acc._id}`)}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={[ledgerDim(), { fontSize: 11, marginRight: spacing.sm }]}>{rankLabel}</Text>
                      <Text style={[ledgerText(), { fontSize: 14, flex: 1 }]} numberOfLines={1}>
                        {acc.name}
                      </Text>
                    </View>
                    <Text style={ledgerText({ fontSize: 14 })}>{formatCurrency(acc.currentBalance)}</Text>
                  </Pressable>
                );
              })}
              <View style={ledgerLine} />
            </>
          )}
        </View>

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
  rowLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
});
