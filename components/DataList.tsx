import type { ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  type FlatListProps,
  type ListRenderItem,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';
import { Text } from './Text';

type DataListProps<T> = FlatListProps<T> & {
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

function DefaultEmpty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.background }]}>
      <Text variant="cardTitle" style={styles.emptyTitle}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodySmall" style={StyleSheet.flatten([styles.emptyDesc, { color: colors.muted }])}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function DataList<T>({
  data,
  renderItem,
  keyExtractor,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  refreshing = false,
  onRefresh,
  ListEmptyComponent,
  ...rest
}: DataListProps<T>) {
  const { colors } = useTheme();
  const empty =
    ListEmptyComponent !== undefined ? (
      ListEmptyComponent
    ) : (
      <DefaultEmpty title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={data?.length === 0 ? styles.emptyContainer : styles.listContent}
      ListEmptyComponent={data?.length === 0 ? empty : null}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} />
        ) : undefined
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyAction: {
    marginTop: spacing.md,
  },
});
