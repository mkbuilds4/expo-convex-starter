# Expo Convex Starter

Expo / React Native **template** for iOS, Android, and web. Auth (Better Auth), theme, navigation, and a small Convex backend example. Clone or use as a template to build your app.

## Link Convex (first-time setup)

1. Run and follow the prompts (log in with GitHub, create or select a project):
   ```bash
   npx convex dev
   ```
2. Convex will create `.env.local` with `CONVEX_URL`. For Expo you also need the URL in a **public** env var. Add this to `.env.local`:
   ```
   EXPO_PUBLIC_CONVEX_URL=<paste the same value as CONVEX_URL>
   ```
   Or copy the deployment URL from the [Convex dashboard](https://dashboard.convex.dev) and set:
   ```
   EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```
3. Leave `npx convex dev` running in a terminal while developing (it syncs your `convex/` functions). In another terminal run `npm start` for Expo.

Backend code lives in `convex/`. Use `useQuery`, `useMutation`, and `useAction` from `convex/react` in your app.

## Run with Expo Go

1. Install **Expo Go** on your phone: [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Start the dev server:
   ```bash
   npm start
   ```
3. Scan the QR code with your phone:
   - **iOS:** Camera app
   - **Android:** Expo Go app

Same Wi‑Fi as your computer is required.

## Other commands

- **iOS simulator:** `npm run ios`
- **Android emulator:** `npm run android`
- **Web:** `npm run web`

## EAS Build (installable apps)

1. Install EAS CLI: `npm install -g eas-cli` and log in with `eas login`.
2. Configure the project (first time): `eas build:configure`.
3. Set env vars for the build (e.g. in EAS dashboard or `eas.json` under `build.*.env`):
   - `EXPO_PUBLIC_CONVEX_URL` (and `EXPO_PUBLIC_CONVEX_SITE_URL` if you use auth) so the built app can reach your Convex backend.
4. Run a build:
   - **Preview (internal):** `eas build --profile preview --platform ios` or `--platform android`
   - **Production:** `eas build --profile production --platform all`

See [Expo Application Services](https://docs.expo.dev/build/introduction/) for more.

## Deep linking

The app scheme is `expostarter` (see `app.json` → `expo.scheme`). Example links:

- **Password reset (example route):** `expostarter://reset-password?token=YOUR_TOKEN`
- **Auth / OAuth callbacks:** Use `expostarter://` (or your custom scheme) as the redirect URI when configuring Better Auth or OAuth providers.

Routes are defined under `app/` (Expo Router). The `reset-password` screen demonstrates reading query params via `useLocalSearchParams()`.

## Edit

The app uses **Expo Router** (file-based routing). Entry is `app/_layout.tsx`; screens live under `app/`, e.g. `app/(tabs)/index.tsx` (Home), `app/(auth)/sign-in.tsx`, `app/reset-password.tsx`.
