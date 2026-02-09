import { registerRootComponent } from 'expo';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

import App from './App';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
  { unsavedChangesWarning: false }
);

function Root() {
  return (
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  );
}

registerRootComponent(Root);
