import type { ReactNode } from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
};

export function BottomSheetModal({
  isOpen,
  onClose,
  children,
}: BottomSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: colors.muted }]} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
});
