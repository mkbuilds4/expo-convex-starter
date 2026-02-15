import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { spacing } from '../../lib/theme';
import {
  LEDGER_BG,
  ledgerText,
  ledgerDim,
  ledgerLine,
  ledgerHeader,
  ledgerHeaderRow,
  ledgerSection,
  ledgerBtn,
} from '../../lib/ledger-theme';
import { formatCurrency, getCurrentMonth, formatMonth, parseAmountToCents } from '../../lib/format';
import { Text, Input, RoomCard } from '../../components';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const month = getCurrentMonth();
  const dashboard = useQuery(api.budget.getDashboard, { month });
  const setAssignment = useMutation(api.budget.setAssignment);
  const addToAssignment = useMutation(api.budget.addToAssignment);
  const createCategory = useMutation(api.budget.createCategory);
  const removeCategory = useMutation(api.budget.removeCategory);
  const removeGroup = useMutation(api.budget.removeGroup);

  const [editingCategory, setEditingCategory] = useState<Id<'budgetCategories'> | null>(null);
  const [assignAmount, setAssignAmount] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const categories = dashboard?.categories ?? [];
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

  const handleRemoveCategory = (categoryId: Id<'budgetCategories'>, categoryName: string) => {
    Alert.alert(
      'Remove category?',
      `"${categoryName}" will be removed. Assignments and transaction links will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCategory({ id: categoryId });
              setEditingCategory(null);
              Toast.show({ type: 'success', text1: 'Category removed' });
            } catch (e) {
              Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
            }
          },
        },
      ]
    );
  };

  const handleRemoveGroup = (groupName: string, count: number) => {
    Alert.alert(
      'Remove whole group?',
      `"${groupName}" and all ${count} categor${count === 1 ? 'y' : 'ies'} in it will be removed. Assignments and transaction links will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove group',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroup({ groupName });
              Toast.show({ type: 'success', text1: 'Group removed' });
            } catch (e) {
              Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: LEDGER_BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, backgroundColor: LEDGER_BG }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, styles.budgetHeader]}>
          <View>
            <Text style={[ledgerText(), styles.pageTitle]}>BUDGET</Text>
            <Text style={[ledgerDim(), styles.pageSubtitle]}>{formatMonth(month)}</Text>
          </View>
          <View style={ledgerLine} />
        </View>

        {Object.entries(byGroup).map(([groupName, cats]) => (
          <View key={groupName} style={[ledgerSection, styles.categorySection]}>
            <View style={styles.groupHeader}>
              <Text style={[ledgerDim(), styles.groupLabel]}>{groupName}</Text>
              <Pressable
                onPress={() => handleRemoveGroup(groupName, cats.length)}
                style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Text style={ledgerText({ fontSize: 11 })}>REMOVE</Text>
              </Pressable>
            </View>
            <View style={ledgerLine} />
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
                onRemove={() => handleRemoveCategory(c._id, c.name)}
              />
            ))}
            <View style={ledgerLine} />
          </View>
        ))}

        <View style={[ledgerSection, styles.addSection]}>
          <Text style={[ledgerDim(), styles.addSectionLabel]}>ADD CATEGORY</Text>
          <View style={ledgerLine} />
          {categories.length === 0 && (
            <Text style={[ledgerDim(), styles.hintText]}>
              Add a group and category to start tracking spending.
            </Text>
          )}
          <View style={styles.addCard}>
            <Input
              placeholder="Group (e.g. Fixed)"
              value={newGroup}
              onChangeText={setNewGroup}
            />
            <Input
              placeholder="Category name"
              value={newCategory}
              onChangeText={setNewCategory}
            />
            <Pressable
              style={({ pressed }) => [
                styles.addCategoryBtn,
                pressed && { opacity: 0.85 },
                !newCategory.trim() && styles.addCategoryBtnDisabled,
              ]}
              onPress={handleCreateCategory}
              disabled={!newCategory.trim()}
            >
              <Text
                style={[
                  ledgerText({ fontSize: 15 }),
                  styles.addCategoryBtnText,
                  !newCategory.trim() && styles.addCategoryBtnTextDisabled,
                ]}
              >
                Add category
              </Text>
            </Pressable>
          </View>
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
  budgetHeader: {
    paddingBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: 18,
    letterSpacing: 1,
  },
  pageSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  categorySection: {
    paddingTop: spacing.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  groupLabel: {
    fontSize: 13,
    letterSpacing: 1,
  },
  removeBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#B91C1C',
    borderRadius: 0,
  },
  addSection: {
    paddingTop: spacing.xl,
  },
  addSectionLabel: {
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  hintText: {
    fontSize: 15,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  addCard: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.35)',
    backgroundColor: 'rgba(30, 10, 10, 0.6)',
    gap: spacing.lg,
  },
  addCategoryBtn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 2,
    borderColor: '#B91C1C',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addCategoryBtnDisabled: {
    borderColor: '#7F1D1D',
    opacity: 0.6,
  },
  addCategoryBtnText: {
    color: '#B91C1C',
  },
  addCategoryBtnTextDisabled: {
    color: '#7F1D1D',
  },
});
