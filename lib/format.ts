/** Format amount in cents to currency string */
export function formatCurrency(cents: number, options?: { signed?: boolean }): string {
  const value = cents / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  if (options?.signed && value !== 0) {
    return value < 0 ? `-${formatted}` : `+${formatted}`;
  }
  return formatted;
}

/** Current month in YYYY-MM */
export function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Month label for display e.g. "February 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/** Parse cents from user input e.g. "12.50" -> 1250 */
export function parseAmountToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned || '0');
  return Math.round(num * 100);
}

/** Time-based greeting: Good morning / afternoon / evening */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
