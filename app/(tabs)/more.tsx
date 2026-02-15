import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme-context';
import { spacing } from '../../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerHeaderRow,
  ledgerSection,
  ledgerRow,
} from '../../lib/ledger-theme';
import { Text } from '../../components';

const ITEMS = [
  // Debt
  { route: '/debt-plan' as const, label: 'Get out of debt', icon: 'trophy-outline', subtitle: 'Debt-free date, progress & milestones' },
  { route: '/debt-targets' as const, label: 'Payoff order', icon: 'list-outline', subtitle: 'Highest APR first — what to pay first' },
  // Income & bills
  { route: '/income' as const, label: 'Income sources', icon: 'cash-outline', subtitle: 'Track salary, freelance, gigs' },
  { route: '/income-forecast' as const, label: 'Income forecast', icon: 'calculator-outline', subtitle: 'Forecast from potential jobs' },
  { route: '/bills' as const, label: 'Recurring bills', icon: 'calendar-outline', subtitle: 'Monthly expenses for income target' },
  // Net worth & account
  { route: '/(tabs)/networth' as const, label: 'Net Worth', icon: 'trending-up-outline', subtitle: 'Assets, debts & history' },
  { route: '/(tabs)/profile' as const, label: 'Profile', icon: 'person-outline', subtitle: 'Account & member info' },
  { route: '/(tabs)/settings' as const, label: 'Settings', icon: 'settings-outline', subtitle: 'Theme, notifications & data' },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

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
              <Text style={[ledgerText(), { fontSize: 16, letterSpacing: 1 }]}>MORE</Text>
              <Text style={[ledgerDim(), { fontSize: 12, marginTop: 2 }]}>
                Net worth, profile & settings
              </Text>
            </View>
          </View>
          <View style={ledgerLine} />
        </View>

        <View style={ledgerSection}>
          <Text style={[ledgerDim(), styles.sectionLabel]}>NAVIGATION</Text>
          <View style={ledgerLine} />
          {ITEMS.map((item, i) => (
            <Pressable
              key={item.route}
              style={({ pressed }) => [
                ledgerRow,
                pressed && { opacity: 0.7 },
                i < ITEMS.length - 1 && styles.rowBorder,
              ]}
              onPress={() => router.push(item.route)}
            >
              <View style={styles.rowLeft}>
                <Text style={[ledgerText(), { fontSize: 14, flex: 1 }]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={[ledgerDim(), { fontSize: 11 }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7F1D1D" />
            </Pressable>
          ))}
          <View style={ledgerLine} />
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
  rowLeft: { flex: 1, minWidth: 0 },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(185, 28, 28, 0.2)',
  },
});
