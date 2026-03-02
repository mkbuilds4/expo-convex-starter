import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { LEDGER_RED, LEDGER_RED_DIM, LEDGER_FONT } from './ledger-theme';
import { useTheme } from './theme-context';

const LEDGER_GREEN = '#15803d';
const LEDGER_GREEN_DIM = '#166534';
const LEDGER_RED_LIGHT = '#991B1B';
const LEDGER_RED_DIM_LIGHT = '#57534E';
const LEDGER_GREEN_LIGHT = '#166534';
const LEDGER_GREEN_DIM_LIGHT = '#15803d';

type FinancialStateContextValue = {
  /** True when user has any debt (totalDebtNow > 0). */
  inDebt: boolean;
  /** Accent color: red while in debt, green when debt-free. */
  ledgerAccent: string;
  /** Dim variant of accent (for secondary text/lines). */
  ledgerAccentDim: string;
};

const FinancialStateContext = createContext<FinancialStateContextValue | null>(null);

export function FinancialStateProvider({ children }: { children: ReactNode }) {
  const { resolvedScheme } = useTheme();
  const projection = useQuery(api.debt.getDebtPayoffProjection);
  const inDebt = projection === undefined ? true : projection.totalDebtNow > 0;

  const isLight = resolvedScheme === 'light';
  const value = useMemo<FinancialStateContextValue>(
    () => ({
      inDebt,
      ledgerAccent: inDebt
        ? (isLight ? LEDGER_RED_LIGHT : LEDGER_RED)
        : (isLight ? LEDGER_GREEN_LIGHT : LEDGER_GREEN),
      ledgerAccentDim: inDebt
        ? (isLight ? LEDGER_RED_DIM_LIGHT : LEDGER_RED_DIM)
        : (isLight ? LEDGER_GREEN_DIM_LIGHT : LEDGER_GREEN_DIM),
    }),
    [inDebt, isLight]
  );

  return (
    <FinancialStateContext.Provider value={value}>
      {children}
    </FinancialStateContext.Provider>
  );
}

export function useFinancialState(): FinancialStateContextValue {
  const ctx = useContext(FinancialStateContext);
  if (!ctx) {
    return {
      inDebt: true,
      ledgerAccent: LEDGER_RED,
      ledgerAccentDim: LEDGER_RED_DIM,
    };
  }
  return ctx;
}

/** Hook for ledger-themed screens: accent colors that flip red → green when debt-free. */
export function useLedgerAccent() {
  const { ledgerAccent, ledgerAccentDim, inDebt } = useFinancialState();
  return { accent: ledgerAccent, accentDim: ledgerAccentDim, inDebt };
}

/** Ledger text/line styles that use the current accent (red when in debt, green when debt-free). */
export function useLedgerStyles() {
  const { ledgerAccent, ledgerAccentDim } = useFinancialState();
  return {
    ledgerText: (style: Record<string, unknown> = {}) => ({ fontFamily: LEDGER_FONT, color: ledgerAccent, ...style }),
    ledgerDim: (style: Record<string, unknown> = {}) => ({ fontFamily: LEDGER_FONT, color: ledgerAccentDim, ...style }),
    ledgerLine: { height: 1, backgroundColor: ledgerAccent, opacity: 0.4 },
    accent: ledgerAccent,
    accentDim: ledgerAccentDim,
  };
}

export { LEDGER_GREEN, LEDGER_GREEN_DIM };
