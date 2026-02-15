import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast, { SuccessToast, ErrorToast } from 'react-native-toast-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { useConvexAuth } from 'convex/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from '../lib/theme-context';
import { FinancialStateProvider } from '../lib/financial-state-context';
import { HideAmountsProvider } from '../lib/hide-amounts-context';
import { convex } from '../lib/convex';
import { authClient } from '../lib/auth-client';
import { ErrorBoundary } from '../components/ErrorBoundary';

function ThemedStatusBar() {
  const { resolvedScheme } = useTheme();
  return <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />;
}

function ThemedToast() {
  const { colors } = useTheme();
  const config = useMemo(
    () => ({
      success: (props: object) => <SuccessToast {...props} style={[(props as { style?: object }).style, { borderLeftColor: colors.primary }]} />,
      error: (props: object) => <ErrorToast {...props} style={[(props as { style?: object }).style, { borderLeftColor: colors.error }]} />,
    }),
    [colors.primary, colors.error]
  );
  return <Toast config={config} />;
}

function RootLayoutContent() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const content = (
    <>
      <ThemedStatusBar />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
      <ThemedToast />
    </>
  );
  // Only run debt query when authenticated; otherwise useFinancialState() falls back to default (red).
  if (!isLoading && isAuthenticated) {
    return (
      <FinancialStateProvider>
        <HideAmountsProvider>{content}</HideAmountsProvider>
      </FinancialStateProvider>
    );
  }
  return content;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ConvexBetterAuthProvider client={convex} authClient={authClient}>
            <RootLayoutContent />
          </ConvexBetterAuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
