# Plaid integration setup

The app is ready to connect Plaid for bank linking. The **Connect your bank** option in the Add account flow will open Plaid Link once the backend is configured.

## Steps to enable Plaid

1. **Create a Plaid account**  
   Sign up at [dashboard.plaid.com](https://dashboard.plaid.com) and get your **Client ID** and **Secret** (use Sandbox for development).

2. **Add secrets to Convex**  
   In **Convex Dashboard** → your deployment → **Settings** → **Environment Variables**, add:
   - `PLAID_CLIENT_ID` – your Plaid client ID  
   - `PLAID_SECRET` – your **sandbox** secret for development (use production secret for live)  

   See [docs/PLAID_ENV.md](./PLAID_ENV.md) for a quick reference. Do not commit these values to git.

3. **Implement the Convex action**  
   The app expects a Convex **action** that:
   - Creates a **link token** via Plaid’s `/link/token/create` API (POST).
   - Accepts the authenticated user’s ID and returns the `link_token` so the client can open Plaid Link.
   - After the user links an account, another action should **exchange** the `public_token` for an `access_token` and store it (e.g. in `plaidItems` and linked `accounts`).

4. **React Native / Expo**  
   Use `react-native-plaid-link-sdk` (or Expo-compatible Plaid Link) in the app. When the user taps **Connect your bank**, call your action to get `link_token`, then open Plaid Link with that token. On success, send the `public_token` to your Convex action to exchange and save the item.

## Plaid API overview

- **Create link token:** `POST https://development.plaid.com/link/token/create`  
  Body: `{ "user": { "client_user_id": "<your_user_id>" }, "client_name": "Fulus", "products": ["transactions"], "country_codes": ["US"], "language": "en" }`  
  Headers: `PLAID-CLIENT-ID`, `PLAID-SECRET`, `Content-Type: application/json`

- **Exchange public token:** `POST https://development.plaid.com/item/public_token/exchange`  
  Body: `{ "public_token": "<from_client>" }`  
  Returns `access_token`; store it securely and use it to fetch accounts/transactions.

The schema already has `plaidItems` and `accounts.plaidItemId` for when you add the full flow.
