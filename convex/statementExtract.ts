/**
 * Statement/screenshot extraction for manual account entry.
 * User uploads an image (screenshot or statement); we use OpenAI Vision to extract
 * account name, balance, amount owed, type, etc., and return for form pre-fill.
 *
 * Set OPENAI_API_KEY in Convex Dashboard → Settings → Environment Variables.
 * Upload URL is from convex/upload.ts (mutations cannot live in "use node" files).
 */

"use node";

import { action } from './_generated/server';
import { v } from 'convex/values';

async function getAuthUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

const EXTRACT_PROMPT = `Look at this image of a bank or credit account statement, balance screenshot, or similar.
Extract the following if visible (use null for anything not found):
1. accountName: full account name or institution + type (e.g. "Chase Checking", "Amex Gold Card")
2. balance: current balance in dollars (number, for deposit accounts like checking/savings). Only the main balance.
3. amountOwed: total amount owed in dollars (number, for credit cards or loans)
4. type: one of "checking" | "savings" | "credit card" | "loan"
5. interestRate: APR as a number (e.g. 18 for 18%), or null
6. minimumPayment: minimum payment in dollars per month (number), or null

Return ONLY a single JSON object, no markdown or explanation, with keys: accountName, balance, amountOwed, type, interestRate, minimumPayment.
Use null for any value you cannot read. Amounts are numbers (e.g. 1500.50), not strings.`;

export type ExtractedAccount = {
  accountName: string | null;
  balance: number | null;
  amountOwed: number | null;
  type: 'checking' | 'savings' | 'credit card' | 'loan' | null;
  interestRate: number | null;
  minimumPayment: number | null;
};

export const extractAccountFromStatement = action({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }): Promise<ExtractedAccount> => {
    await getAuthUserId(ctx);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Statement extraction is not configured. Add OPENAI_API_KEY in Convex Dashboard → Settings → Environment Variables.'
      );
    }

    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error('File not found or expired.');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
    const contentType = res.headers.get('content-type') ?? '';
    const isImage = contentType.startsWith('image/');
    const isPdf = contentType.includes('pdf');

    if (!isImage && !isPdf) {
      throw new Error('Please upload an image (screenshot or statement photo). PDF support may be added later.');
    }

    if (isPdf) {
      throw new Error(
        'PDF upload is not supported yet. Please take a screenshot of your statement or balance page and upload that image.'
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = contentType.split(';')[0].trim() || 'image/jpeg';

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACT_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const err = (await openaiRes.json()) as { error?: { message?: string } };
      throw new Error(err?.error?.message ?? `OpenAI error: ${openaiRes.status}`);
    }

    const data = (await openaiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('No extraction result');

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const type = parsed.type as string | null;
    const normalizedType =
      type === 'checking' || type === 'savings' || type === 'credit card' || type === 'loan' ? type : null;

    return {
      accountName: typeof parsed.accountName === 'string' ? parsed.accountName : null,
      balance: typeof parsed.balance === 'number' ? parsed.balance : null,
      amountOwed: typeof parsed.amountOwed === 'number' ? parsed.amountOwed : null,
      type: normalizedType,
      interestRate: typeof parsed.interestRate === 'number' ? parsed.interestRate : null,
      minimumPayment: typeof parsed.minimumPayment === 'number' ? parsed.minimumPayment : null,
    };
  },
});
