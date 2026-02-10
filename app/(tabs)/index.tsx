import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { api } from '../../convex/_generated/api';
import { taskSchema, type TaskFormData } from '../../lib/schemas';
import { useTheme } from '../../lib/theme-context';
import { spacing, radii } from '../../lib/theme';
import { authClient } from '../../lib/auth-client';
import { Button, Input, Text } from '../../components';

function AddTaskForm() {
  const createTask = useMutation(api.tasks.create);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '' },
  });

  const onSubmit = async (data: TaskFormData) => {
    try {
      await createTask({ title: data.title });
      reset();
      Toast.show({ type: 'success', text1: 'Added' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed to add' });
    }
  };

  return (
    <>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            placeholder="New item"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!isSubmitting}
            accessibilityLabel="New item title"
          />
        )}
      />
      {errors.title ? (
        <Text variant="error" style={styles.formError}>{errors.title.message}</Text>
      ) : null}
      <Button loading={isSubmitting} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
        Add item
      </Button>
    </>
  );
}

function DemoItem({
  title,
  completed,
  onToggle,
}: {
  title: string;
  completed: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.demoRow, pressed && styles.demoRowPressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={title}
    >
      <View
        style={[
          styles.demoCheckbox,
          { borderColor: colors.muted },
          completed && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
      >
        {completed ? (
          <Text style={StyleSheet.flatten([styles.demoCheckmark, { color: colors.onPrimary }])}>✓</Text>
        ) : null}
      </View>
      <Text
        variant="body"
        style={StyleSheet.flatten([
          styles.demoRowTitle,
          completed && { textDecorationLine: 'line-through' as const, color: colors.muted },
        ])}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const tasks = useQuery(api.tasks.list);
  const toggleTask = useMutation(api.tasks.toggle);
  const { colors } = useTheme();

  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || null;
  const welcomeName = firstName || 'there';
  const taskList = tasks ?? [];
  const isEmpty = taskList.length === 0;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="title">Home</Text>
        <Text variant="subtitle">Welcome back</Text>
      </View>

      {/* Welcome */}
      <View style={styles.section}>
        <View style={[styles.welcomeCard, { backgroundColor: colors.surface }]}>
          <Text variant="cardTitle" style={{ color: colors.text }}>
            Hi, {welcomeName}
          </Text>
          <Text variant="body" style={StyleSheet.flatten([styles.welcomeSubtext, { color: colors.muted }])}>
            This is your home screen. Replace this with your own content and features.
          </Text>
        </View>
      </View>

      {/* Shortcuts */}
      <View style={styles.section}>
        <Text variant="caption" style={StyleSheet.flatten([styles.sectionLabel, { color: colors.muted }])}>
          Shortcuts
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open Profile"
          >
            <Text variant="body" style={{ color: colors.text }}>Profile</Text>
            <Text variant="body" style={{ color: colors.muted }}>→</Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.background }]} />
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/(tabs)/settings')}
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
          >
            <Text variant="body" style={{ color: colors.text }}>Settings</Text>
            <Text variant="body" style={{ color: colors.muted }}>→</Text>
          </Pressable>
        </View>
      </View>

      {/* Convex demo – example of real-time data */}
      <View style={styles.section}>
        <Text variant="caption" style={StyleSheet.flatten([styles.sectionLabel, { color: colors.muted }])}>
          Convex demo
        </Text>
        <Text variant="caption" style={StyleSheet.flatten([styles.sectionHint, { color: colors.muted }])}>
          Example list with real-time sync. Replace or remove this section.
        </Text>
        <View style={[styles.demoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.demoForm}>
            <AddTaskForm />
          </View>
          <View style={[styles.demoDivider, { backgroundColor: colors.background }]} />
          {isEmpty ? (
            <View style={styles.demoEmpty}>
              <Text variant="body" style={StyleSheet.flatten([styles.demoEmptyTitle, { color: colors.text }])}>
                No items yet
              </Text>
              <Text variant="caption" style={{ color: colors.muted }}>
                Add one above to see Convex sync.
              </Text>
            </View>
          ) : (
            <View style={styles.demoList}>
              {taskList.map((item) => (
                <View key={item._id}>
                  <DemoItem
                    title={item.title}
                    completed={item.completed}
                    onToggle={() => toggleTask({ id: item._id })}
                  />
                  {item._id !== taskList[taskList.length - 1]?._id ? (
                    <View style={[styles.demoRowDivider, { backgroundColor: colors.background }]} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl * 2 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionHint: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  welcomeCard: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  welcomeSubtext: {
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },
  demoCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  demoForm: {
    marginBottom: spacing.sm,
  },
  demoDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  demoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  demoEmptyTitle: {
    marginBottom: 0,
  },
  demoList: {
    gap: 0,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  demoRowPressed: { opacity: 0.8 },
  demoRowDivider: {
    height: 1,
    marginLeft: 24 + spacing.md,
  },
  demoCheckbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoCheckmark: { fontSize: 14, fontWeight: '600' },
  demoRowTitle: { flex: 1 },
  formError: { marginBottom: spacing.sm },
});
