import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { formatCurrency, getCurrentMonth, getTimeGreeting, formatMonth } from '../../lib/format';
import { Text, Button } from '../../components';
import { authClient } from '../../lib/auth-client';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const month = getCurrentMonth();
  const dashboard = useQuery(api.budget.getDashboard, { month });
  const netWorth = useQuery(api.networth.getSummary);
  const { data: session } = authClient.useSession();

  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || 'there';
  const greeting = getTimeGreeting();

  const readyToAssign = dashboard?.readyToAssign ?? 0;
  const categories = dashboard?.categories ?? [];
  const totalOnBudget = dashboard?.totalOnBudget ?? 0;
  const accounts = (dashboard?.onBudgetAccounts ?? []).filter((a) => a.type === 'depository');

  const overspentCount = categories.filter((c) => (c.assigned - c.spent) < 0).length;
  const onTrackCount = categories.length - overspentCount;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="subtitle" style={styles.greeting}>
            {greeting}, {firstName}
          </Text>
          <Text variant="caption" style={{ color: colors.muted }}>
            {formatMonth(month)}
          </Text>
        </View>
      </View>

      {/* Hero: Ready to Assign */}
      <Pressable
        style={({ pressed }) => [
          styles.heroCard,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
        onPress={() => router.push('/(tabs)/budget')}
      >
        <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.9)' }]}>
          Ready to assign
        </Text>
        <Text style={[styles.heroAmount, { color: '#fff' }]}>
          {formatCurrency(readyToAssign)}
        </Text>
        <View style={styles.heroHint}>
          <Text style={[styles.heroHintText, { color: 'rgba(255,255,255,0.85)' }]}>
            Tap to assign to rooms
          </Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
        </View>
      </Pressable>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [
            styles.quickActionBtn,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push('/(tabs)/transactions')}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text variant="caption" style={[styles.quickActionLabel, { color: colors.text }]}>
            Add transaction
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.quickActionBtn,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push('/(tabs)/budget')}
        >
          <Ionicons name="business-outline" size={24} color={colors.primary} />
          <Text variant="caption" style={[styles.quickActionLabel, { color: colors.text }]}>
            House
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.quickActionBtn,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push('/(tabs)/accounts')}
        >
          <Ionicons name="card-outline" size={24} color={colors.primary} />
          <Text variant="caption" style={[styles.quickActionLabel, { color: colors.text }]}>
            Accounts
          </Text>
        </Pressable>
      </View>

      {/* Accounts summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
            Checking & savings
          </Text>
          {accounts.length > 0 && (
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              {formatCurrency(totalOnBudget)}
            </Text>
          )}
        </View>
        {accounts.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="body" style={{ color: colors.muted }}>
              No accounts yet. Add checking or savings to start.
            </Text>
            <Button onPress={() => router.push('/(tabs)/accounts')} style={styles.topMargin}>
              Add account
            </Button>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {accounts.slice(0, 4).map((acc) => (
              <Pressable
                key={acc._id}
                style={({ pressed }) => [
                  styles.accountRow,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => router.push('/(tabs)/accounts')}
              >
                <View style={[styles.accountDot, { backgroundColor: colors.primary }]} />
                <View style={styles.accountInfo}>
                  <Text variant="body" style={{ color: colors.text }} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text variant="caption" style={{ color: colors.muted }}>
                    {acc.subtype}
                  </Text>
                </View>
                <Text variant="body" style={{ color: colors.text, fontWeight: '500' }}>
                  {formatCurrency(acc.availableBalance ?? acc.currentBalance)}
                </Text>
              </Pressable>
            ))}
            {accounts.length > 4 && (
              <Pressable
                style={styles.viewAllRow}
                onPress={() => router.push('/(tabs)/accounts')}
              >
                <Text variant="caption" style={{ color: colors.primary }}>
                  View all {accounts.length} accounts
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Your house at a glance */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="caption" style={[styles.sectionLabel, { color: colors.muted }]}>
              Your house this month
            </Text>
            <Text variant="caption" style={{ color: colors.muted }}>
              {onTrackCount} rooms on track
              {overspentCount > 0 && ` · ${overspentCount} crowded`}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.95 },
            ]}
            onPress={() => router.push('/(tabs)/budget')}
          >
            {categories.slice(0, 5).map((c) => {
              const available = c.assigned - c.spent;
              const isOverspent = available < 0;
              const pct = c.assigned > 0 ? Math.min(100, (c.spent / c.assigned) * 100) : 0;
              return (
                <View key={c._id} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <Text variant="body" style={{ color: colors.text }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <View style={[styles.miniBar, { backgroundColor: colors.background }]}>
                      <View
                        style={[
                          styles.miniBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: isOverspent ? colors.error : colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    variant="caption"
                    style={{
                      color: isOverspent ? colors.error : colors.muted,
                      fontWeight: isOverspent ? '600' : '400',
                    }}
                  >
                    {isOverspent ? `−${formatCurrency(-available)}` : formatCurrency(available)}
                  </Text>
                </View>
              );
            })}
            <View style={styles.viewAllRow}>
              <Text variant="caption" style={{ color: colors.primary }}>
                Explore all rooms
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </Pressable>
        </View>
      )}

      {/* Net worth teaser */}
      {netWorth && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0) && (
        <Pressable
          style={({ pressed }) => [
            styles.netWorthTeaser,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.9 },
          ]}
          onPress={() => router.push('/(tabs)/networth')}
        >
          <View style={styles.netWorthRow}>
            <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
            <Text variant="body" style={{ color: colors.text }}>Net worth</Text>
          </View>
          <Text
            variant="body"
            style={{
              color: netWorth.netWorth >= 0 ? colors.primary : colors.error,
              fontWeight: '600',
            }}
          >
            {formatCurrency(netWorth.netWorth)}
          </Text>
        </Pressable>
      )}

      <View style={{ height: insets.bottom + spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 2,
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.lg,
  },
  heroLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  heroHintText: {
    fontSize: 13,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionLabel: {
    fontSize: 12,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accountInfo: { flex: 1, minWidth: 0 },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  categoryLeft: { flex: 1, minWidth: 0 },
  miniBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  netWorthTeaser: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  netWorthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topMargin: { marginTop: spacing.md },
});
