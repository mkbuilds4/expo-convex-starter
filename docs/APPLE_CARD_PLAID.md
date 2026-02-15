# Apple Card and Fulus

**Apple Card (and Apple Cash, Savings) are not supported by Plaid.** They use **Apple’s FinanceKit** API instead. Apps like YNAB and Monarch connect Apple Card by integrating FinanceKit directly in their iOS app, not through Plaid Link.

## Why “Apple” doesn’t work in Plaid Link

- **Plaid** connects to thousands of banks and card issuers, but **Apple Card is not one of them**. Apple Card is issued by Goldman Sachs and is only exposed to third-party apps via **FinanceKit** on the device.
- So “Apple” will not appear (or will not connect) when you use **Connect your bank** (Plaid Link) in Fulus.

## How Apple Card could work in Fulus (FinanceKit)

To support Apple Card we would need a **native FinanceKit integration** on iOS:

1. **Apple Developer**
   - Request the **FinanceKit** entitlement (Apple restricts this to approved financial management apps).
   - App typically needs to be in the Finance category and provide real financial management features.

2. **iOS app**
   - Use Apple’s FinanceKit framework (Swift) to request access to the user’s Wallet financial accounts (Apple Card, Apple Cash, Savings).
   - User grants access in **Settings → Apps → Fulus → Wallet** and can enable **“All Available Activity”** for full transaction history.
   - No Plaid involved for these accounts.

3. **Backend**
   - FinanceKit data is on-device only. We’d need to send balances and transactions from the app to our backend (e.g. Convex) so they show in the same budget and net worth views as Plaid-linked accounts.

## What works today

- **Plaid in Fulus** works for all institutions that Plaid supports (most US banks, many credit cards, etc.). It does **not** include Apple Card.
- **OAuth banks (e.g. Chase, many large US banks)** on iOS require a **redirect URI** when creating the Plaid link token. We support this via the `PLAID_REDIRECT_URI` environment variable and Universal Links (see [PLAID_ENV.md](./PLAID_ENV.md)).

## Summary

| Topic | Details |
|--------|--------|
| **Apple Card in Plaid** | Not supported; Apple Card is not a Plaid institution. |
| **How others support Apple Card** | Via **Apple FinanceKit** (native iOS), not Plaid. |
| **Fulus today** | Plaid only; FinanceKit for Apple Card is not yet implemented. |
| **When we add Apple Card** | It will be through a separate FinanceKit integration on iOS, not through “Connect your bank” (Plaid). |
