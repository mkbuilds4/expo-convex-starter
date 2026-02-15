import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { LEDGER_RED, LEDGER_RED_DIM, LEDGER_FONT, ledgerLine as baseLedgerLine } from './ledger-theme';

const LEDGER_GREEN = '#15803d';
const LEDGER_GREEN_DIM = '#166534';

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
  const projection = useQuery(api.debt.getDebtPayoffProjection);
  const inDebt = projection === undefined ? true : projection.totalDebtNow > 0;

  const value = useMemo<FinancialStateContextValue>(
    () => ({
      inDebt,
      ledgerAccent: inDebt ? LEDGER_RED : LEDGER_GREEN,
      ledgerAccentDim: inDebt ? LEDGER_RED_DIM : LEDGER_GREEN_DIM,
    }),
    [inDebt]
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
    ledgerLine: { ...baseLedgerLine, backgroundColor: ledgerAccent },
    accent: ledgerAccent,
    accentDim: ledgerAccentDim,
  };
}

export { LEDGER_GREEN, LEDGER_GREEN_DIM };
