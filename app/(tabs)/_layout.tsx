import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConvexAuth } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme-context';
import { spacing } from '../../lib/theme';
import { LEDGER_BG } from '../../lib/ledger-theme';
import { useLedgerAccent } from '../../lib/financial-state-context';

const AUTH_SETTLE_MS = 2000;

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { colors } = useTheme();
  const { accent, accentDim } = useLedgerAccent();
  const authSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      if (authSettleRef.current) clearTimeout(authSettleRef.current);
      authSettleRef.current = null;
      return;
    }
    // Debounce redirect so brief Convex reconnects on device don't kick user to auth (2s)
    authSettleRef.current = setTimeout(() => {
      authSettleRef.current = null;
      router.replace('/(auth)');
    }, AUTH_SETTLE_MS);
    return () => {
      if (authSettleRef.current) clearTimeout(authSettleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router in deps causes redirect loops when Convex reconnects on device
  }, [isAuthenticated, isLoading]);

  const tabBarStyle = {
    backgroundColor: LEDGER_BG,
    borderTopColor: accent,
    borderTopWidth: 1,
    height: 56 + insets.bottom,
    paddingTop: spacing.sm,
    paddingBottom: insets.bottom,
    elevation: 0,
    shadowOpacity: 0,
  };

  const iconSize = 22;
  const screenOptions = {
    headerShown: false,
    tabBarStyle,
    tabBarActiveTintColor: accent,
    tabBarInactiveTintColor: accentDim,
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    tabBarItemStyle: {
      paddingVertical: spacing.xs,
    },
    tabBarHideOnKeyboard: true,
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarLabel: 'Budget',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarLabel: 'Accounts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'card' : 'card-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarLabel: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'menu' : 'menu-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="networth"
        options={{
          href: null,
          title: 'Net Worth',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
