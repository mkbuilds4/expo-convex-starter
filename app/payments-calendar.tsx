import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, type DateData } from 'react-native-calendars';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { PaymentItem } from '../convex/paymentsCalendar';
import { spacing, radii, appFontFamily } from '../lib/theme';
import { formatCurrency, formatDateLong, formatTransactionDateLabel, formatMonth } from '../lib/format';
import { Text, BackHeader } from '../components';
import {
  ledgerHeader,
  ledgerSection,
  ledgerSectionLabel,
  ledgerRow,
  useLedgerTheme,
} from '../lib/ledger-theme';
import { useLedgerStyles } from '../lib/financial-state-context';
import { Ionicons } from '@expo/vector-icons';

function getMonthRange(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}`;
  const endDate = new Date(y, m - 1 + 3, 1);
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth() + 1;
  const end = `${endY}-${String(endM).padStart(2, '0')}`;
  return { start, end };
}

export default function PaymentsCalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ledgerBg } = useLedgerTheme();
  const { ledgerText, ledgerDim, ledgerLine, accent, accentDim } = useLedgerStyles();

  const now = new Date();
  const initialMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const { start, end } = useMemo(() => getMonthRange(visibleMonth), [visibleMonth]);
  const paymentsByDate = useQuery(api.paymentsCalendar.getPaymentsByDate, { startMonth: start, endMonth: end }) ?? {};
  const markPaid = useMutation(api.paymentsCalendar.markPaid);
  const markUnpaid = useMutation(api.paymentsCalendar.markUnpaid);

  const markedDates = useMemo(() => {
    const marked: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string; selectedTextColor?: string }> = {};
    for (const date of Object.keys(paymentsByDate)) {
      marked[date] = { marked: true, dotColor: accent };
    }
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        marked: true,
        dotColor: accent,
        selected: true,
        selectedColor: accent,
        selectedTextColor: ledgerBg,
      };
    }
    return marked;
  }, [paymentsByDate, selectedDate, accent, ledgerBg]);

  const selectedPayments: PaymentItem[] = selectedDate ? paymentsByDate[selectedDate] ?? [] : [];
  const totalSelectedCents = selectedPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = selectedPayments.filter((p) => p.paid).length;

  // All payments sorted by date for list view
  const allPaymentsByDate = useMemo(() => {
    const dates = Object.keys(paymentsByDate).sort();
    return dates.map((date) => ({ date, items: paymentsByDate[date] }));
  }, [paymentsByDate]);

  const calendarTheme = {
    backgroundColor: ledgerBg,
    calendarBackground: ledgerBg,
    textSectionTitleColor: accentDim,
    textSectionTitleDisabledColor: accentDim + '66',
    selectedDayBackgroundColor: accent,
    selectedDayTextColor: ledgerBg,
    todayTextColor: accent,
    dayTextColor: accent,
    textDisabledColor: accentDim + '66',
    dotColor: accent,
    selectedDotColor: ledgerBg,
    arrowColor: accent,
    disabledArrowColor: accentDim + '66',
    monthTextColor: accent,
    indicatorColor: accent,
    textDayFontFamily: appFontFamily,
    textMonthFontFamily: appFontFamily,
    textDayHeaderFontFamily: appFontFamily,
    textDayFontWeight: '400' as const,
    textMonthFontWeight: '700' as const,
    textDayHeaderFontWeight: '400' as const,
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 12,
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleMonthChange = (month: DateData) => {
    setVisibleMonth(month.dateString.slice(0, 7));
  };

  return (
    <View style={[styles.screen, { backgroundColor: ledgerBg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ledgerHeader, { paddingBottom: spacing.md }]}>
          <BackHeader
            title="Payments calendar"
            subtitle="Bills & credit card payments by day"
            onBack={() => router.back()}
            variant="ledger"
          />
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('calendar')}
              style={({ pressed }) => [
                styles.viewToggleBtn,
                { borderColor: viewMode === 'calendar' ? accent : accentDim + '80' },
                viewMode === 'calendar' && { backgroundColor: accent + '22' },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="calendar-outline" size={16} color={viewMode === 'calendar' ? accent : accentDim} />
              <Text style={[viewMode === 'calendar' ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })]}>Calendar</Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('list')}
              style={({ pressed }) => [
                styles.viewToggleBtn,
                { borderColor: viewMode === 'list' ? accent : accentDim + '80' },
                viewMode === 'list' && { backgroundColor: accent + '22' },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? accent : accentDim} />
              <Text style={[viewMode === 'list' ? ledgerText({ fontSize: 12 }) : ledgerDim({ fontSize: 12 })]}>List</Text>
            </Pressable>
          </View>
          <View style={ledgerLine} />
        </View>

        <>
        {viewMode === 'calendar' && (
          <View style={[ledgerSection, styles.calendarSection]}>
            <Calendar
              current={visibleMonth + '-01'}
              onDayPress={handleDayPress}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              theme={calendarTheme}
              style={[styles.calendar, { borderColor: accentDim + '40' }]}
              enableSwipeMonths
            />
          </View>
        )}

        {viewMode === 'list' ? (
        <View style={ledgerSection}>
          <View style={styles.listHeader}>
            <Text style={[ledgerDim(), ledgerSectionLabel]}>ALL PAYMENTS</Text>
            <View style={styles.monthNav}>
              <Pressable
                onPress={() => {
                  const [y, m] = visibleMonth.split('-').map(Number);
                  const prev = new Date(y, m - 2, 1);
                  setVisibleMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                }}
                style={({ pressed }) => [styles.monthNavBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="chevron-back" size={18} color={accentDim} />
              </Pressable>
              <Text style={[ledgerText(), { fontSize: 12 }]}>{formatMonth(visibleMonth)}</Text>
              <Pressable
                onPress={() => {
                  const [y, m] = visibleMonth.split('-').map(Number);
                  const next = new Date(y, m, 1);
                  setVisibleMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                }}
                style={({ pressed }) => [styles.monthNavBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="chevron-forward" size={18} color={accentDim} />
              </Pressable>
            </View>
          </View>
          <View style={ledgerLine} />
          {allPaymentsByDate.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[ledgerDim(), { fontSize: 14 }]}>No payments in this date range.</Text>
            </View>
          ) : (
            allPaymentsByDate.map(({ date, items }) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={[ledgerDim(), styles.dateGroupLabel]}>{formatTransactionDateLabel(date).toUpperCase()}</Text>
                {items.map((item) => {
                  const monthForRecord = date.slice(0, 7);
                  const handleTogglePaid = () => {
                    if (item.paid) {
                      markUnpaid({ type: item.type, refId: item.id, month: monthForRecord });
                    } else {
                      markPaid({ type: item.type, refId: item.id, month: monthForRecord });
                    }
                  };
                  return (
                    <View key={`${item.type}-${item.id}-${date}`} style={[ledgerRow, styles.paymentRow]}>
                      <Pressable
                        onPress={handleTogglePaid}
                        style={({ pressed }) => [
                          styles.checkbox,
                          { borderColor: item.paid ? accent : accentDim },
                          pressed && { opacity: 0.7 },
                        ]}
                        hitSlop={8}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.paid }}
                        accessibilityLabel={item.paid ? `Mark ${item.name} as unpaid` : `Mark ${item.name} as paid`}
                      >
                        {item.paid && <Ionicons name="checkmark" size={16} color={accent} />}
                      </Pressable>
                      <View style={[styles.paymentLeft, item.paid && styles.paidRow]}>
                        <View style={styles.paymentNameRow}>
                          <Text style={[ledgerText({ fontSize: 15 }), item.paid && { textDecorationLine: 'line-through', opacity: 0.7 }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={[styles.typeBadge, { borderColor: accentDim }]}>
                            <Text style={[ledgerDim(), { fontSize: 10 }]}>
                              {item.type === 'bill' ? 'BILL' : 'CREDIT'}
                            </Text>
                          </View>
                        </View>
                        {item.type === 'bill' && item.dueDay !== undefined && (
                          <Text style={[ledgerDim(), { fontSize: 11 }]}>
                            {item.paid && item.paidAt ? `Paid ${item.paidAt}` : `Recurring · due day ${item.dueDay}`}
                          </Text>
                        )}
                        {item.type === 'credit' && (
                          <Text style={[ledgerDim(), { fontSize: 11 }]}>
                            {item.paid && item.paidAt
                              ? `Paid ${item.paidAt}`
                              : item.dueDay !== undefined
                                ? `Recurring · due day ${item.dueDay}`
                                : 'Minimum payment'}
                          </Text>
                        )}
                      </View>
                      <Text style={[ledgerText(), { fontSize: 15 }, item.paid && { opacity: 0.7 }]}>{formatCurrency(item.amount)}</Text>
                    </View>
                  );
                })}
              </View>
            ))
          )}
          <View style={ledgerLine} />
        </View>
        ) : (
        <View style={ledgerSection}>
          <Text style={[ledgerDim(), ledgerSectionLabel]}>
            {selectedDate ? formatTransactionDateLabel(selectedDate).toUpperCase() : 'SELECT A DAY'}
          </Text>
          <View style={ledgerLine} />
          {!selectedDate ? (
            <View style={styles.emptyState}>
              <Text style={[ledgerDim(), { fontSize: 14 }]}>
                Tap a date with a dot to see payments due that day.
              </Text>
            </View>
          ) : selectedPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[ledgerDim(), { fontSize: 14 }]}>
                No payments due on {formatDateLong(selectedDate)}.
              </Text>
            </View>
          ) : (
            <>
              {selectedPayments.map((item) => {
                const monthForRecord = selectedDate!.slice(0, 7);
                const handleTogglePaid = () => {
                  if (item.paid) {
                    markUnpaid({ type: item.type, refId: item.id, month: monthForRecord });
                  } else {
                    markPaid({ type: item.type, refId: item.id, month: monthForRecord });
                  }
                };
                return (
                  <View key={`${item.type}-${item.id}`} style={[ledgerRow, styles.paymentRow]}>
                    <Pressable
                      onPress={handleTogglePaid}
                      style={({ pressed }) => [
                        styles.checkbox,
                        { borderColor: item.paid ? accent : accentDim },
                        pressed && { opacity: 0.7 },
                      ]}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.paid }}
                      accessibilityLabel={item.paid ? `Mark ${item.name} as unpaid` : `Mark ${item.name} as paid`}
                    >
                      {item.paid && <Ionicons name="checkmark" size={16} color={accent} />}
                    </Pressable>
                    <View style={[styles.paymentLeft, item.paid && styles.paidRow]}>
                      <View style={styles.paymentNameRow}>
                        <Text style={[ledgerText({ fontSize: 15 }), item.paid && { textDecorationLine: 'line-through', opacity: 0.7 }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={[styles.typeBadge, { borderColor: accentDim }]}>
                          <Text style={[ledgerDim(), { fontSize: 10 }]}>
                            {item.type === 'bill' ? 'BILL' : 'CREDIT'}
                          </Text>
                        </View>
                      </View>
                      {item.type === 'bill' && item.dueDay !== undefined && (
                        <Text style={[ledgerDim(), { fontSize: 11 }]}>
                          {item.paid && item.paidAt ? `Paid ${item.paidAt}` : `Recurring · due day ${item.dueDay}`}
                        </Text>
                      )}
                      {item.type === 'credit' && (
                        <Text style={[ledgerDim(), { fontSize: 11 }]}>
                          {item.paid && item.paidAt
                            ? `Paid ${item.paidAt}`
                            : item.dueDay !== undefined
                              ? `Recurring · due day ${item.dueDay}`
                              : 'Minimum payment'}
                        </Text>
                      )}
                    </View>
                    <Text style={[ledgerText(), { fontSize: 15 }, item.paid && { opacity: 0.7 }]}>{formatCurrency(item.amount)}</Text>
                  </View>
                );
              })}
              <View style={[ledgerRow, styles.totalRow]}>
                <View>
                  <Text style={[ledgerDim(), { fontSize: 12 }]}>Total due</Text>
                  {paidCount > 0 && (
                    <Text style={[ledgerDim(), { fontSize: 11, marginTop: 2 }]}>
                      {paidCount} of {selectedPayments.length} paid
                    </Text>
                  )}
                </View>
                <Text style={[ledgerText(), { fontSize: 17 }]}>{formatCurrency(totalSelectedCents)}</Text>
              </View>
            </>
          )}
          <View style={ledgerLine} />
        </View>
        )}
        </>

        <View style={[ledgerSection, styles.legendSection]}>
          <Text style={[ledgerDim(), ledgerSectionLabel]}>LEGEND</Text>
          <View style={ledgerLine} />
          <View style={[ledgerRow, styles.legendRow]}>
            <View style={styles.legendItem}>
              <Ionicons name="receipt-outline" size={16} color={accentDim} />
              <Text style={[ledgerDim(), { fontSize: 12 }]}>Recurring bills (rent, utilities, etc.)</Text>
            </View>
          </View>
          <View style={[ledgerRow, styles.legendRow]}>
            <View style={styles.legendItem}>
              <Ionicons name="card-outline" size={16} color={accentDim} />
              <Text style={[ledgerDim(), { fontSize: 12 }]}>Credit card minimum payments</Text>
            </View>
          </View>
          <View style={[ledgerRow, styles.legendRow]}>
            <View style={styles.legendItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={accentDim} />
              <Text style={[ledgerDim(), { fontSize: 12 }]}>Tap checkbox when you&apos;ve paid</Text>
            </View>
          </View>
          <View style={ledgerLine} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 0 },
  viewToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  calendarSection: { paddingTop: spacing.lg },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthNavBtn: {
    padding: spacing.xs,
  },
  dateGroupLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  calendar: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    paddingRight: spacing.lg,
  },
  paymentRow: { paddingVertical: spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidRow: { opacity: 0.85 },
  paymentLeft: { flex: 1, minWidth: 0 },
  paymentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  totalRow: {
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(185, 28, 28, 0.3)',
  },
  legendSection: { paddingTop: spacing.xl },
  legendRow: { paddingVertical: spacing.sm },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
