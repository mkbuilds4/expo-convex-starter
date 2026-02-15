import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { formatCurrency, getCurrentMonth, formatMonth, parseAmountToCents } from '../../lib/format';
import { Text, Button, Input, RoomCard } from '../../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const month = getCurrentMonth();
  const dashboard = useQuery(api.budget.getDashboard, { month });
  const setAssignment = useMutation(api.budget.setAssignment);
  const addToAssignment = useMutation(api.budget.addToAssignment);
  const createCategory = useMutation(api.budget.createCategory);

  const [editingCategory, setEditingCategory] = useState<Id<'budgetCategories'> | null>(null);
  const [assignAmount, setAssignAmount] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const categories = dashboard?.categories ?? [];
  const readyToAssign = dashboard?.readyToAssign ?? 0;
  const byGroup = categories.reduce((acc, c) => {
    const g = c.groupName || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {} as Record<string, typeof categories>);

  const handleSetAssignment = async (categoryId: Id<'budgetCategories'>) => {
    const cents = parseAmountToCents(assignAmount);
    if (cents < 0) return;
    try {
      await setAssignment({ categoryId, month, assignedAmount: cents });
      setAssignAmount('');
      setEditingCategory(null);
      Toast.show({ type: 'success', text1: 'Updated' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const handleQuickAssign = async (categoryId: Id<'budgetCategories'>, amount: number) => {
    try {
      await addToAssignment({ categoryId, month, amountToAdd: amount });
      Toast.show({ type: 'success', text1: 'Assigned' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const handleCreateCategory = async () => {
    const group = newGroup.trim() || 'Other';
    const name = newCategory.trim();
    if (!name) return;
    try {
      await createCategory({
        groupName: group,
        name,
        sortOrder: categories.length,
      });
      setNewGroup('');
      setNewCategory('');
      Toast.show({ type: 'success', text1: 'Category added' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={[styles.houseIcon, { backgroundColor: colors.primary + '25' }]}>
            <Ionicons name="home" size={26} color={colors.primary} />
          </View>
          <View>
            <Text variant="title">Your financial house</Text>
            <Text variant="subtitle" style={{ color: colors.muted }}>{formatMonth(month)}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.vaultCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
        <View style={styles.vaultRow}>
          <Ionicons name="key-outline" size={20} color={colors.muted} />
          <Text variant="caption" style={{ color: colors.muted }}>Ready to assign</Text>
        </View>
        <Text variant="cardTitle" style={{ color: readyToAssign >= 0 ? colors.primary : colors.error, marginTop: 4 }}>
          {formatCurrency(readyToAssign)}
        </Text>
        <Text variant="caption" style={{ color: colors.muted, marginTop: 2 }}>
          Assign to rooms below
        </Text>
      </View>

      {Object.entries(byGroup).map(([groupName, cats]) => (
        <View key={groupName} style={styles.section}>
          <Text variant="caption" style={[styles.wingLabel, { color: colors.muted }]}>
            {groupName}
          </Text>
          {cats.map((c) => (
            <RoomCard
              key={c._id}
              name={c.name}
              assigned={c.assigned}
              spent={c.spent}
              isEditing={editingCategory === c._id}
              assignAmount={assignAmount}
              onAssignAmountChange={setAssignAmount}
              onSetAssignment={() => handleSetAssignment(c._id)}
              onCancelEdit={() => setEditingCategory(null)}
              onStartEdit={() => setEditingCategory(c._id)}
              onQuickAssign={(amount) => handleQuickAssign(c._id, amount)}
            />
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text variant="caption" style={[styles.wingLabel, { color: colors.muted }]}>
          Add a room
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Input
            placeholder="Wing (e.g. Fixed)"
            value={newGroup}
            onChangeText={setNewGroup}
          />
          <Input
            placeholder="Room name"
            value={newCategory}
            onChangeText={setNewCategory}
          />
          <Button onPress={handleCreateCategory} disabled={!newCategory.trim()}>
            Add room
          </Button>
        </View>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  houseIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  vaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  wingLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
});
