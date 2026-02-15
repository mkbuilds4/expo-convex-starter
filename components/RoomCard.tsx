import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing, radii } from '../lib/theme';
import { formatCurrency } from '../lib/format';
import { Text } from './Text';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';

export type RoomCardProps = {
  name: string;
  assigned: number;
  spent: number;
  isEditing: boolean;
  assignAmount: string;
  onAssignAmountChange: (v: string) => void;
  onSetAssignment: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onQuickAssign: (cents: number) => void;
  /** When provided, shows a delete control to remove this room/category */
  onRemove?: () => void;
};

export function RoomCard({
  name,
  assigned,
  spent,
  isEditing,
  assignAmount,
  onAssignAmountChange,
  onSetAssignment,
  onCancelEdit,
  onStartEdit,
  onQuickAssign,
  onRemove,
}: RoomCardProps) {
  const { colors } = useTheme();
  const available = assigned - spent;
  const isOverspent = available < 0;
  const isSparse = assigned > 0 && spent < assigned * 0.5;
  const pct = assigned > 0 ? Math.min(150, (spent / assigned) * 100) : 0;

  const statusLabel = isOverspent
    ? `Over budget · −${formatCurrency(-available)}`
    : `Available ${formatCurrency(available)}`;

  return (
    <View
      style={[
        styles.room,
        {
          backgroundColor: colors.surface,
          borderColor: isOverspent ? colors.error : colors.background,
          borderWidth: isOverspent ? 2 : 1,
        },
      ]}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleRow}>
          <View style={[styles.roomIcon, { backgroundColor: isOverspent ? colors.error + '20' : colors.primary + '20' }]}>
            <Ionicons
              name={isOverspent ? 'warning' : 'home-outline'}
              size={18}
              color={isOverspent ? colors.error : colors.primary}
            />
          </View>
          <View style={styles.roomTitleBlock}>
            <Text variant="body" style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption" style={{ color: colors.muted, marginTop: 2 }}>
              {isOverspent ? 'Over budget' : isSparse ? 'Has space' : 'On track'}
            </Text>
          </View>
          {onRemove ? (
            <Pressable
              onPress={onRemove}
              style={[styles.removeBtn, { backgroundColor: colors.background }]}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="caption" style={{ color: colors.muted }}>
            {formatCurrency(spent)} / {formatCurrency(assigned)}
          </Text>
          <Text
            variant="caption"
            style={{ color: isOverspent ? colors.error : colors.primary, fontWeight: '600', marginTop: 2 }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Room "fullness" bar: crowded = full/overflow, sparse = empty */}
      <View style={[styles.fullnessTrack, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.fullnessFill,
            {
              width: `${Math.min(100, pct)}%`,
              backgroundColor: isOverspent ? colors.error : colors.primary,
              opacity: isOverspent ? 0.9 : 0.7,
            },
          ]}
        />
        {isOverspent && pct > 100 && (
          <View
            style={[
              styles.fullnessOverflow,
              {
                width: `${Math.min(50, pct - 100)}%`,
                backgroundColor: colors.error,
              },
            ]}
          />
        )}
      </View>

      {isEditing ? (
        <View style={styles.assignRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Amount"
            placeholderTextColor={colors.muted}
            value={assignAmount}
            onChangeText={onAssignAmountChange}
            keyboardType="decimal-pad"
          />
          <Button onPress={onSetAssignment} style={styles.assignBtn}>
            Set
          </Button>
          <Button variant="secondary" onPress={onCancelEdit}>
            Cancel
          </Button>
        </View>
      ) : (
        <View style={styles.quickRow}>
          <Pressable
            style={[styles.quickBtn, { backgroundColor: colors.background }]}
            onPress={() => onQuickAssign(1000)}
          >
            <Text variant="caption" style={{ color: colors.text }}>+$10</Text>
          </Pressable>
          <Pressable
            style={[styles.quickBtn, { backgroundColor: colors.background }]}
            onPress={() => onQuickAssign(5000)}
          >
            <Text variant="caption" style={{ color: colors.text }}>+$50</Text>
          </Pressable>
          <Pressable
            style={[styles.quickBtn, { backgroundColor: colors.background }]}
            onPress={onStartEdit}
          >
            <Text variant="caption" style={{ color: colors.primary }}>Custom</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  roomIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomTitleBlock: { flex: 1, minWidth: 0 },
  fullnessTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fullnessFill: {
    height: '100%',
    borderRadius: 3,
  },
  fullnessOverflow: {
    height: '100%',
    borderRadius: 0,
    minWidth: 4,
  },
  assignRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    minWidth: 100,
    fontSize: 16,
  },
  assignBtn: { minWidth: 60 },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
