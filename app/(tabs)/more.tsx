import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { Text } from '../../components';

const ITEMS = [
  { route: '/(tabs)/networth' as const, label: 'Net Worth', icon: 'trending-up-outline', subtitle: 'Assets, debts & history' },
  { route: '/(tabs)/profile' as const, label: 'Profile', icon: 'person-outline', subtitle: 'Account & member info' },
  { route: '/(tabs)/settings' as const, label: 'Settings', icon: 'settings-outline', subtitle: 'Theme, notifications & data' },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="title">More</Text>
        <Text variant="subtitle">Net worth, profile & settings</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {ITEMS.map((item, i) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [
              styles.row,
              pressed && { opacity: 0.8 },
              i < ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.background },
            ]}
            onPress={() => router.push(item.route)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.primary} />
              </View>
              <View>
                <Text variant="body" style={{ color: colors.text }}>{item.label}</Text>
                <Text variant="caption" style={{ color: colors.muted }}>{item.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <View style={{ height: insets.bottom + spacing.xxl }} />
    </ScrollView>
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
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
