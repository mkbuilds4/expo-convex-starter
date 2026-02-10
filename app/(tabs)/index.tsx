import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { taskSchema, type TaskFormData } from '../../lib/schemas';
import { useTheme } from '../../lib/theme-context';
import { spacing } from '../../lib/theme';
import { Button, Card, Input, Text, ThemeToggle, DataList } from '../../components';

function AddTaskForm() {
  const createTask = useMutation(api.tasks.create);
  const { colors } = useTheme();
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
      Toast.show({ type: 'success', text1: 'Task added' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed to add task' });
    }
  };

  return (
    <Card compact style={styles.addCard}>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            placeholder="New task"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!isSubmitting}
            accessibilityLabel="New task title"
            accessibilityHint="Enter task title to add"
          />
        )}
      />
      {errors.title ? (
        <Text variant="error" style={styles.error}>
          {errors.title.message}
        </Text>
      ) : null}
      <Button loading={isSubmitting} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
        Add task
      </Button>
    </Card>
  );
}

function TaskItem({
  id,
  title,
  completed,
  onToggle,
}: {
  id: Id<'tasks'>;
  title: string;
  completed: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.taskRow,
        { backgroundColor: colors.surface },
        pressed && styles.taskPressed,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={`Task: ${title}`}
      accessibilityHint={completed ? 'Tap to mark incomplete' : 'Tap to mark complete'}
    >
      <View
        style={[
          styles.checkbox,
          { borderColor: colors.muted },
          completed && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
      >
        {completed ? <Text style={StyleSheet.flatten([styles.checkmark, { color: colors.onPrimary }])}>✓</Text> : null}
      </View>
      <Text
        variant="body"
        style={StyleSheet.flatten([styles.taskTitle, completed && { textDecorationLine: 'line-through' as const, color: colors.muted }])}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const tasks = useQuery(api.tasks.list);
  const toggleTask = useMutation(api.tasks.toggle);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text variant="title">Tasks</Text>
        <Text variant="subtitle">Example list with Convex</Text>
        <ThemeToggle />
      </View>
      <AddTaskForm />
      <DataList
        data={tasks ?? []}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No tasks yet"
        emptyDescription="Add a task above to get started."
        renderItem={({ item }) => (
          <TaskItem
            id={item._id}
            title={item.title}
            completed={item.completed}
            onToggle={() => toggleTask({ id: item._id })}
          />
        )}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  addCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: { flex: 1 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  taskPressed: { opacity: 0.9 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 14, fontWeight: '600' },
  taskTitle: { flex: 1 },
  error: { marginBottom: spacing.sm },
});
