# Plaid environment variables (Convex)

Add these in **Convex Dashboard** → your deployment → **Settings** → **Environment Variables**. Do not commit secrets to git.

| Name | Value | Notes |
|------|--------|--------|
| `PLAID_CLIENT_ID` | Your Plaid client ID | From [dashboard.plaid.com](https://dashboard.plaid.com) → Keys |
| `PLAID_SECRET` | Sandbox or production secret | Sandbox for dev; **production** secret for production deployment |
| `PLAID_BASE_URL` | *(optional)* `https://production.plaid.com` | Set only for **production**; omit for sandbox |
| `PLAID_REDIRECT_URI` | *(optional)* Your HTTPS redirect URL | **Required for OAuth on iOS.** Add the same URL to Plaid Dashboard → Team Settings → API → Allowed redirect URIs, and set it up as a [Universal Link](https://plaid.com/docs/link/oauth/#create-and-register-a-redirect-uri) so users return to the app after bank auth. Example: `https://yourapp.com/plaid/` |

**Production:** For the Convex **production** deployment, set `PLAID_CLIENT_ID` and `PLAID_SECRET` to your **production** keys and set `PLAID_BASE_URL` to `https://production.plaid.com`. If you use production keys without `PLAID_BASE_URL`, or sandbox keys with it, you’ll get “invalid client_id or secret”.

After saving, redeploy or push your Convex functions so the actions pick up the new variables.

---

### Using production for everything (no sandbox)

1. **Convex production deployment**  
   In the Convex Dashboard, open the **production** deployment → **Settings** → **Environment Variables** and set:
   - `PLAID_CLIENT_ID` = your **production** client ID (from [Plaid Dashboard](https://dashboard.plaid.com) → Keys)
   - `PLAID_SECRET` = your **production** secret (not the sandbox secret)
   - `PLAID_BASE_URL` = `https://production.plaid.com`

2. **Re-link all banks**  
   Access tokens created in sandbox do not work in production. After switching to production:
   - Remove every account that was linked via Plaid (use **Remove** on each linked account in the Accounts tab), or remove the linked bank connection so Plaid-linked accounts disappear.
   - Use **Connect your bank** again for each institution. The new link token and access tokens will be production tokens, and **Import from bank** / **Refresh** will work with production.

3. **Deploy**  
   Run `npx convex deploy` (or deploy from the dashboard) so production uses the env vars above.

Then in the app, tap **Connect your bank** in the Add account flow to create a link token and open bank linking.
