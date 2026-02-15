import { Platform } from 'react-native';
import { spacing } from './theme';

/** Ledger-style design tokens (black background, red monospace) used across the app. */
export const LEDGER_BG = '#000000';
export const LEDGER_RED = '#B91C1C';
export const LEDGER_RED_DIM = '#7F1D1D';
export const LEDGER_FONT = Platform.select({ ios: 'Menlo', android: 'monospace' });

export function ledgerText(style: Record<string, unknown> = {}) {
  return { fontFamily: LEDGER_FONT, color: LEDGER_RED, ...style };
}

export function ledgerDim(style: Record<string, unknown> = {}) {
  return { fontFamily: LEDGER_FONT, color: LEDGER_RED_DIM, ...style };
}

export const ledgerLine = {
  height: 1,
  backgroundColor: LEDGER_RED,
  opacity: 0.4,
};

export const ledgerScreen = {
  flex: 1,
  backgroundColor: LEDGER_BG,
};

export const ledgerScrollContent = {
  paddingBottom: spacing.xxl,
  backgroundColor: LEDGER_BG,
};

export const ledgerHeader = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  paddingBottom: spacing.md,
};

export const ledgerHeaderRow = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'flex-start' as const,
};

export const ledgerBtn = {
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderWidth: 1,
  borderColor: LEDGER_RED,
  borderRadius: 0,
};

export const ledgerSection = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
};

export const ledgerRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingVertical: spacing.sm,
  paddingRight: 0,
};

export const ledgerSummaryRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingVertical: spacing.md,
};

export const ledgerEmpty = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
};

export const ledgerSectionLabel = {
  fontSize: 11,
  letterSpacing: 1,
  marginBottom: spacing.sm,
};
