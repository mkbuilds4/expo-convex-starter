import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing, radii } from '../lib/theme';
import type { ColorSchemePreference } from '../lib/theme-context';

const OPTIONS: { value: ColorSchemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle() {
  const { preference, setPreference, colors } = useTheme();

  return (
    <View style={styles.row}>
      {OPTIONS.map(({ value, label }) => {
        const selected = preference === value;
        return (
          <Pressable
            key={value}
            onPress={() => setPreference(value)}
            style={[
              styles.pill,
              { backgroundColor: selected ? colors.primary : colors.surface },
            ]}
          >
            <Text style={[styles.label, { color: selected ? colors.onPrimary : colors.muted }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
