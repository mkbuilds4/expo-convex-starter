# Statement / screenshot extraction (Convex)

The **Upload screenshot or statement** option in the Add account flow uses OpenAI Vision to read account name, balance, amount owed, and (for debt accounts) interest rate and minimum payment from an image.

## Setup

1. **Convex environment variable**  
   In **Convex Dashboard** → your deployment → **Settings** → **Environment Variables**, add:

   | Name | Value |
   |------|--------|
   | `OPENAI_API_KEY` | Your [OpenAI API key](https://platform.openai.com/api-keys) |

2. Redeploy or push Convex functions so the action picks up the variable.

## Usage

In the app, open **New account** and tap **Upload screenshot or statement**. Choose:

- **Take photo** – capture a screenshot or photo of your statement/balance screen.
- **Choose from library** – pick an existing image from your device.
- **Choose file** – pick an image file (e.g. from Files). PDF is not supported yet; use a screenshot of the relevant page instead.

The app uploads the image to Convex storage, runs extraction with GPT-4o-mini, and pre-fills the manual account form. Review the values and tap **Save**.

## Privacy

Images are sent to OpenAI only for extraction and are not stored by OpenAI for model training (see [OpenAI API data usage](https://openai.com/policies/api-data-usage-policy)). Convex stores the uploaded file temporarily for the action to read; you can add a cron or cleanup to delete old uploads if desired.
