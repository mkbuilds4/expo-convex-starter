import { spacing, appFontFamily } from './theme';
import { useTheme } from './theme-context';

/** Dark ledger palette (black bg, red monospace). */
export const ledgerDark = {
  bg: '#000000',
  primary: '#B91C1C',
  dim: '#7F1D1D',
};

/** Light ledger palette (off-white bg, darker red for contrast). */
export const ledgerLight = {
  bg: '#FAFAFA',
  primary: '#991B1B',
  dim: '#57534E',
};

/** @deprecated Use useLedgerTheme().ledgerBg or ledgerDark.bg */
export const LEDGER_BG = ledgerDark.bg;

export const LEDGER_RED = ledgerDark.primary;
export const LEDGER_RED_DIM = ledgerDark.dim;

/** Same as theme appFontFamily – use for ledger text helpers. */
export const LEDGER_FONT = appFontFamily;

/** Theme-aware ledger hook. Use this for all ledger-styled screens. */
export function useLedgerTheme() {
  const { resolvedScheme } = useTheme();
  const p = resolvedScheme === 'dark' ? ledgerDark : ledgerLight;
  return {
    ledgerBg: p.bg,
    ledgerPrimary: p.primary,
    ledgerDimColor: p.dim,
    ledgerText: (style: Record<string, unknown> = {}) => ({ fontFamily: LEDGER_FONT, color: p.primary, ...style }),
    ledgerDim: (style: Record<string, unknown> = {}) => ({ fontFamily: LEDGER_FONT, color: p.dim, ...style }),
    ledgerLine: { height: 1, backgroundColor: p.primary, opacity: resolvedScheme === 'dark' ? 0.4 : 0.35 },
    ledgerBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: p.primary,
      borderRadius: 0,
    },
    resolvedScheme,
  };
}

/** @deprecated Use useLedgerTheme() – static dark-mode versions */
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
