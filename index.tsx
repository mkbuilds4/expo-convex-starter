import { registerRootComponent } from 'expo';
import { ConvexReactClient } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { authClient } from './lib/auth-client';

import App from './App';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
  { unsavedChangesWarning: false }
);

function Root() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <App />
    </ConvexBetterAuthProvider>
  );
}

registerRootComponent(Root);
