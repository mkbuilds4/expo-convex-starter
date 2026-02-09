import { registerRootComponent } from 'expo';
import { ConvexReactClient } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { authClient } from './lib/auth-client';
import { ThemeProvider } from './lib/theme-context';

import App from './App';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
  { unsavedChangesWarning: false }
);

function Root() {
  return (
    <ThemeProvider>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <App />
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );
}

registerRootComponent(Root);
