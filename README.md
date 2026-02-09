# ndnd

Expo / React Native app for iOS, Android, and web. Backend: [Convex](https://convex.dev).

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

## Edit

Main app entry is `App.tsx` in the project root.
