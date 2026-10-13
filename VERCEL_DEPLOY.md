# Deploy Medintel to Vercel

The Vercel deployment is the Next.js app in the repository root. Legacy Python/Streamlit source files remain in the working tree for compatibility, but `.vercelignore` excludes them from deployment; no Streamlit runtime is deployed.

## 1. Create a Neon PostgreSQL database

Create a Neon project and copy its pooled connection string. The Vercel app creates its schema and fictional sample network on the first API request. It does not use the local `clinic.db` file.

## 2. Import the repository into Vercel

1. Import the GitHub repository into Vercel.
2. The project is configured with the Next.js framework preset and defaults to the repository root.
3. Keep the default build command (`next build`) and output directory.
4. Add these environment variables for Production, Preview, and Development:

   ```text
   DATABASE_URL=<Neon pooled PostgreSQL URL>
   JWT_SECRET=<random secret with at least 32 characters>
   ```

   Generate a JWT secret locally with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Do not commit actual secrets.

5. Optional AI: add `LLM_API_KEY` and `LLM_MODEL` (defaults to `gpt-4o-mini`). Without the key, the symptom and medicine assistants use local rules. With a key, typed text is sent to the model provider; the app asks visitors for consent first (see `/privacy`).
6. Optional admin: add `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) before first DB initialization to create the admin account. Keep these values private.
7. Deploy. The first database-backed API request creates tables and seeds 12 fictional facilities, 48 sample doctors, and shared demo accounts.

Demo accounts:

- Patient: `patient@medintel.demo` / `PatientDemo123!`
- Doctor: `doctor@medintel.demo` / `DoctorDemo123!`

These shared accounts and all sample names, ratings, fees, phone numbers, and map markers are for demonstration only. Change the demo passwords or remove these accounts before any wider distribution. Never use real patient data in this demo.

## 3. Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env.local` to use registration, sign-in, appointments, and dashboards. Without a database, the public homepage and sample directory remain browseable, while write actions return a setup error rather than claiming to save data. Run `npm install -g vercel` once, then use `vercel dev` for Vercel's local environment emulation.

Run checks before deploying:

```powershell
npm run typecheck
npm run build
```

After deploying, smoke-test these pages: `/` (tour appears once; footer "Welcome tour" replays it), theme picker and dark mode persist after refresh, `/wellness` (trackers, medicine assistant locked until consent, PDF download), `/privacy` (withdraw consent, clear data), `/symptoms` (consent gate), and sign-in with a demo account.

Admin: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) in Vercel, redeploy, sign in, and open `/admin/dashboard` (read-only overview with no patient health details).

## Data and product limits

Vercel Functions are stateless compute; SQLite files in a deployment bundle are not durable shared storage. This app uses Neon PostgreSQL for deployed user accounts and appointment writes. The current local `clinic.db` is not automatically migrated or uploaded. If you need its data, export and review it separately before importing into Neon.

The disease guide is keyword matching, not a trained model; the risk score is illustrative; clinician credentials and sample facilities are not verified. The application is a demonstration, not a production clinical system.
