# Expo Convex Starter

Expo / React Native **template** for iOS, Android, and web. Auth (Better Auth), theme, navigation, and a small Convex backend example. Clone or use as a template to build your app.

---

## What’s included

- **Auth (Better Auth)** – Email/password sign-in and sign-up, session, sign-out, delete account. Auth screens: landing, sign-in, sign-up with password requirements and strength indicator.
- **Navigation** – Expo Router with tabs (Home, Profile, Settings) and stack screens. Authenticated users see tabs; unauthenticated users see auth flow.
- **Theme** – Light / Dark / System with persistence. Themed tab bar, buttons, inputs, and cards.
- **Safe areas** – Top insets (notch / Dynamic Island) applied on all main screens.
- **Home** – Example Convex list (tasks) with add form and toggle; theme toggle.
- **Profile** – View name and email; **Edit profile** screen to update display name.
- **Settings**
  - **Appearance** – Theme (Light / Dark / System).
  - **Notifications** – Push notifications toggle (preference stored locally; wire to EAS Push when ready).
  - **About** – App version, Terms of Service, Privacy Policy (links from env; see below).
  - **Account** – Change password, Sign out, Delete account (with confirmation sheet).
- **Change password** – Current + new + confirm with requirements checklist and strength (same UX as sign-up); show/hide toggles on all fields.
- **Edit profile** – Update name via Better Auth `updateUser`.
- **Shared UI** – `BackHeader` (muted back arrow + title) on change-password and edit-profile; consistent with auth screens.
- **Reset password** – Example deep-link route; wire to your Better Auth reset flow.

---

## What to change before shipping

### 1. App identity

- **Name & slug** – In `app.json`: `expo.name`, `expo.slug`. Update `package.json` `name` if you like.
- **Scheme** – In `app.json`: `expo.scheme` (e.g. `myapp`). Used for deep links and auth redirects. Also set in `lib/auth-client.ts` (`scheme` and `storagePrefix`).

### 2. Environment variables

Create or edit `.env.local` (and set the same in EAS build env when you build):

| Variable | Purpose |
|----------|---------|
| `CONVEX_URL` | Convex deployment URL (from `npx convex dev`). |
| `EXPO_PUBLIC_CONVEX_URL` | Same value; required so the Expo app can reach Convex. |
| `EXPO_PUBLIC_CONVEX_SITE_URL` | Public URL of your Convex/Better Auth backend (e.g. your deployed site). Required for auth. |
| `EXPO_PUBLIC_TERMS_URL` | (Optional) Full URL to Terms of Service. If set, Settings → Terms of Service opens it. |
| `EXPO_PUBLIC_PRIVACY_URL` | (Optional) Full URL to Privacy Policy. If set, Settings → Privacy Policy opens it. |

If `EXPO_PUBLIC_TERMS_URL` or `EXPO_PUBLIC_PRIVACY_URL` are not set, tapping those rows in Settings shows a short hint to add the URLs.

### 3. Theme and branding

- **Colors** – Edit `lib/theme.ts`: `lightColors` and `darkColors`. Adjust `primary`, `background`, `surface`, `text`, `muted`, `error`, `onPrimary` to match your brand.
- **Theme key** – The app stores theme preference under `@expo-convex-starter/color-scheme` in AsyncStorage. Consider changing the key if you rename the app (e.g. `@yourapp/color-scheme`).

### 4. Auth and backend

- **Better Auth** – Server config lives in `convex/auth.ts`. Configure providers, session, and any plugins there. See [Better Auth](https://better-auth.com) docs.
- **Change password / Update user** – The template calls `authClient.changePassword` and `authClient.updateUser`. Ensure your Better Auth server enables these endpoints if you use them.
- **Password reset** – `app/reset-password.tsx` is a placeholder. Wire it to your Better Auth password-reset flow and set the reset link to use your app scheme (e.g. `yourapp://reset-password?token=...`).

### 5. Notifications

- **Push** – The Settings “Push notifications” toggle only stores a preference in AsyncStorage. To send real pushes, add [EAS Push](https://docs.expo.dev/push-notifications/overview/) and use the stored preference when prompting or registering for push.

### 6. Legal and support

- Add real URLs for **Terms of Service** and **Privacy Policy** (see env vars above).
- Optionally add **Help**, **Contact**, or **FAQ** in Settings (e.g. new rows that open URLs or in-app screens).

---

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

---

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

---

## Other commands

- **iOS simulator:** `npm run ios`
- **Android emulator:** `npm run android`
- **Web:** `npm run web`

---

## EAS Build (installable apps)

1. Install EAS CLI: `npm install -g eas-cli` and log in with `eas login`.
2. Configure the project (first time): `eas build:configure`.
3. Set env vars for the build (e.g. in EAS dashboard or `eas.json` under `build.*.env`):
   - `EXPO_PUBLIC_CONVEX_URL` (and `EXPO_PUBLIC_CONVEX_SITE_URL` if you use auth) so the built app can reach your Convex backend.
4. Run a build:
   - **Preview (internal):** `eas build --profile preview --platform ios` or `--platform android`
   - **Production:** `eas build --profile production --platform all`

See [Expo Application Services](https://docs.expo.dev/build/introduction/) for more.

---

## Deep linking

The app scheme is set in `app.json` → `expo.scheme` (template default: `expostarter`). Example links:

- **Password reset (example route):** `expostarter://reset-password?token=YOUR_TOKEN`
- **Auth / OAuth callbacks:** Use `expostarter://` (or your custom scheme) as the redirect URI when configuring Better Auth or OAuth providers.

Change the scheme when you customize the app (see “What to change” above).

---

## Project structure (Expo Router)

- **Entry / root:** `app/_layout.tsx` – providers, theme, Convex + Better Auth, root Stack.
- **Tabs:** `app/(tabs)/` – Home (`index`), Profile, Settings; tab bar is themed.
- **Auth:** `app/(auth)/` – landing (`index`), sign-in, sign-up.
- **Standalone screens:** `app/change-password.tsx`, `app/edit-profile.tsx`, `app/reset-password.tsx`.
- **Shared UI:** `components/` – e.g. `BackHeader`, `Button`, `Input`, `Card`, `ThemeToggle`, `BottomSheetModal`, `DataList`, `ErrorBoundary`. Auth form and password UX live in `screens/AuthScreens.tsx`.
- **Theme:** `lib/theme.ts` (tokens), `lib/theme-context.tsx` (Light/Dark/System).
- **Auth client:** `lib/auth-client.ts` – Better Auth client (scheme and storage prefix here).
