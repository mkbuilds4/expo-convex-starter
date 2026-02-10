import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

const scheme = "expostarter";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: SecureStore,
    }),
    convexClient(),
  ],
});
