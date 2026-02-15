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

/** Format YYYY-MM-DD for display e.g. "Mar 15, 2027" */
export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

/**
 * Parse payment due date from user input.
 * - "15" or "20" → next occurrence of that day (YYYY-MM-DD)
 * - "2026-02-15" → returned as-is if valid
 * Returns undefined if input is empty or invalid.
 */
export function parsePaymentDueDate(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const fullDateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fullDateMatch) {
    const [, y, m, d] = fullDateMatch.map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return undefined;
  }
  const day = parseInt(trimmed, 10);
  if (Number.isNaN(day) || day < 1 || day > 31) return undefined;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (day <= now.getDate()) month += 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  const d = Math.min(day, new Date(year, month + 1, 0).getDate());
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Section label for transaction list: "Today", "Yesterday", or "Mon, Feb 15" */
export function formatTransactionDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1; // YYYY-MM uses day 1
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
