import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';

const LIABILITY_TYPES = ['credit', 'loan'];
const MAX_PROJECTION_MONTHS = 600; // cap simulation

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

/** Debt account with balance for payoff order (avalanche: highest APR first) */
type DebtEntry = {
  _id: Id<'accounts'>;
  name: string;
  type: string;
  currentBalance: number;
  interestRate?: number;
  minimumPayment?: number;
  nextPaymentDueDate?: string;
};

/** Avalanche order: sort by APR descending, null APRs last */
function sortByAvalanche(accounts: DebtEntry[]): DebtEntry[] {
  return [...accounts].sort((a, b) => {
    const rateA = a.interestRate ?? -1;
    const rateB = b.interestRate ?? -1;
    return rateB - rateA; // higher APR first
  });
}

/** Get debt accounts in payoff order (highest APR first). */
export const getDebtPayoffOrder = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const debtAccounts = accounts.filter(
      (a) => LIABILITY_TYPES.includes(a.type) && a.currentBalance > 0
    ) as DebtEntry[];
    return sortByAvalanche(debtAccounts);
  },
});

/** Get user's debt payoff plan (one per user). */
export const getPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('debtPayoffPlans')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
  },
});

/** Set or update debt payoff plan. Snapshot startedTotalDebtCents if not set. */
export const setPlan = mutation({
  args: {
    targetDate: v.string(),
    monthlyExtraCents: v.optional(v.number()),
    startedTotalDebtCents: v.optional(v.number()),
  },
  handler: async (ctx, { targetDate, monthlyExtraCents, startedTotalDebtCents }) => {
    const userId = await requireUserId(ctx);
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const totalDebt = accounts
      .filter((a) => LIABILITY_TYPES.includes(a.type))
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const existing = await ctx.db
      .query('debtPayoffPlans')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    const started = startedTotalDebtCents ?? existing?.startedTotalDebtCents ?? totalDebt;

    const row = {
      userId,
      targetDate,
      startedTotalDebtCents: started,
      monthlyExtraCents: monthlyExtraCents ?? existing?.monthlyExtraCents,
    };

    if (existing) {
      await ctx.db.patch(existing._id, row);
      return existing._id;
    }
    return ctx.db.insert('debtPayoffPlans', row);
  },
});

/** Single debt in simulation (mutable copy). */
type SimDebt = { balance: number; apr: number; minPay: number };

/** Run avalanche payoff simulation; return projected payoff date and on-track. */
function runAvalancheSim(
  debts: { currentBalance: number; interestRate: number | null; minimumPayment: number | null }[],
  monthlyExtraCents: number,
  targetDateStr: string
): {
  projectedPayoffDate: string;
  onTrack: boolean;
  totalInterestCents: number;
  monthsToPayoff: number;
} {
  const targetDate = new Date(targetDateStr);
  const sim: SimDebt[] = debts.map((d) => ({
    balance: d.currentBalance,
    apr: d.interestRate ?? 0,
    minPay: d.minimumPayment ?? 0,
  })).filter((d) => d.balance > 0);

  if (sim.length === 0) {
    const today = new Date();
    return {
      projectedPayoffDate: today.toISOString().slice(0, 10),
      onTrack: true,
      totalInterestCents: 0,
      monthsToPayoff: 0,
    };
  }

  // Avalanche order: highest APR first
  sim.sort((a, b) => b.apr - a.apr);

  let month = 0;
  let totalInterest = 0;
  let extraRemaining = monthlyExtraCents;

  while (month < MAX_PROJECTION_MONTHS) {
    // Apply monthly interest
    for (const d of sim) {
      if (d.balance <= 0) continue;
      const interest = Math.round((d.balance * d.apr) / 12);
      d.balance += interest;
      totalInterest += interest;
    }
    // Minimums to all
    for (const d of sim) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, d.minPay);
      d.balance -= pay;
    }
    // Extra to first debt with balance
    extraRemaining = monthlyExtraCents;
    for (const d of sim) {
      if (d.balance <= 0 || extraRemaining <= 0) continue;
      const pay = Math.min(d.balance, extraRemaining);
      d.balance -= pay;
      extraRemaining -= pay;
    }

    const totalRemaining = sim.reduce((s, d) => s + Math.max(0, d.balance), 0);
    if (totalRemaining <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month + 1);
      return {
        projectedPayoffDate: payoffDate.toISOString().slice(0, 10),
        onTrack: payoffDate <= targetDate,
        totalInterestCents: totalInterest,
        monthsToPayoff: month + 1,
      };
    }
    month++;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);
  return {
    projectedPayoffDate: payoffDate.toISOString().slice(0, 10),
    onTrack: false,
    totalInterestCents: totalInterest,
    monthsToPayoff: month,
  };
}

/** Get debt payoff projection and game stats (progress, milestones). */
export const getDebtPayoffProjection = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const debtAccounts = accounts.filter(
      (a) => LIABILITY_TYPES.includes(a.type) && a.currentBalance > 0
    );
    const totalDebtNow = debtAccounts.reduce((s, a) => s + a.currentBalance, 0);

    const plan = await ctx.db
      .query('debtPayoffPlans')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    const avalancheOrder = sortByAvalanche(debtAccounts);

    const monthlyExtra = plan?.monthlyExtraCents ?? 0;
    const targetDate = plan?.targetDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const projection = runAvalancheSim(
      debtAccounts.map((a) => ({
        currentBalance: a.currentBalance,
        interestRate: a.interestRate ?? null,
        minimumPayment: a.minimumPayment ?? null,
      })),
      monthlyExtra,
      targetDate
    );

    const startedTotal = plan?.startedTotalDebtCents ?? totalDebtNow;
    const paidOffFromStart = Math.max(0, startedTotal - totalDebtNow);
    const paidOffPercent = startedTotal > 0 ? (paidOffFromStart / startedTotal) * 100 : 0;

    const totalMinimumsCents = debtAccounts.reduce(
      (s, a) => s + (a.minimumPayment ?? 0),
      0
    );

    const debtInput = debtAccounts.map((a) => ({
      currentBalance: a.currentBalance,
      interestRate: a.interestRate ?? null,
      minimumPayment: a.minimumPayment ?? null,
    }));

    // Always find minimum extra per month to hit target date (when target is set)
    let minimumExtraToHitTargetCents: number | null = null;
    if (plan?.targetDate && debtInput.length > 0) {
      let low = 0;
      // Cap high enough to find required extra (e.g. pay off in 1 month = totalDebtNow; allow up to ~$50k extra)
      const highCap = Math.max(totalDebtNow, 5000000); // $50k or full debt
      let high = highCap;
      for (let i = 0; i < 30; i++) {
        const mid = Math.round((low + high) / 2);
        const test = runAvalancheSim(debtInput, mid, plan.targetDate);
        if (test.onTrack) {
          minimumExtraToHitTargetCents = mid;
          high = mid;
        } else {
          low = mid + 1;
        }
        if (low > high) break;
      }
    }

    const requiredExtraCents = minimumExtraToHitTargetCents ?? monthlyExtra;
    const requiredMonthlyTotalCents = totalMinimumsCents + requiredExtraCents;

    const milestones = [
      { id: '25', label: '25% paid off', percent: 25, achieved: paidOffPercent >= 25 },
      { id: '50', label: '50% paid off', percent: 50, achieved: paidOffPercent >= 50 },
      { id: '75', label: '75% paid off', percent: 75, achieved: paidOffPercent >= 75 },
      { id: '100', label: 'Debt-free', percent: 100, achieved: totalDebtNow <= 0 },
    ];

    return {
      totalDebtNow,
      startedTotalDebtCents: plan?.startedTotalDebtCents ?? totalDebtNow,
      paidOffPercent,
      paidOffCents: paidOffFromStart,
      targetDate: plan?.targetDate ?? null,
      monthlyExtraCents: plan?.monthlyExtraCents ?? 0,
      totalMinimumsCents,
      requiredMonthlyTotalCents,
      minimumExtraToHitTargetCents,
      addMoreToHitTargetCents:
        minimumExtraToHitTargetCents != null
          ? Math.max(0, minimumExtraToHitTargetCents - (plan?.monthlyExtraCents ?? 0))
          : null,
      projection: {
        projectedPayoffDate: projection.projectedPayoffDate,
        onTrack: projection.onTrack,
        totalInterestCents: projection.totalInterestCents,
        monthsToPayoff: projection.monthsToPayoff,
      },
      avalancheOrder: avalancheOrder.map((a) => ({
        _id: a._id,
        name: a.name,
        type: a.type,
        currentBalance: a.currentBalance,
        interestRate: a.interestRate ?? undefined,
        minimumPayment: a.minimumPayment ?? undefined,
      })),
      milestones,
    };
  },
});
