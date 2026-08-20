# Deploy Walkthrough — Future Property Holdings

## Prerequisites

| Service | What you need | Free tier? |
|---------|---------------|------------|
| **MongoDB Atlas** | Connection string (`MONGODB_URI`) | ✅ M0 cluster |
| **Resend** | API key (`RESEND_API_KEY`) | ✅ 100 emails/day |
| **Africa's Talking** | API key + username | ✅ Sandbox |
| **Vercel** | Account + CLI | ✅ Hobby plan |

---

## 1. Create a MongoDB Atlas Cluster

1. Go to <https://cloud.mongodb.com> → **Create a Free Cluster** (M0, shared).
2. Under **Database Access**, create a user (e.g. `fph_app`) with a strong password.
3. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) for Vercel serverless.
4. Click **Connect → Drivers** and copy the connection string.

```
mongodb+srv://fph_app:<PASSWORD>@cluster0.xxxxx.mongodb.net/future_properties?retryWrites=true&w=majority
```

---

## 2. Get a Resend API Key

1. Sign up at <https://resend.com>.
2. Go to **API Keys** → **Create API Key** (name it `FPH Production`).
3. Copy the key (starts with `re_`).

> **Tip:** By default Resend lets you send from `onboarding@resend.dev`. To use a custom domain, verify it under **Domains**.

---

## 3. Set up Africa's Talking (SMS)

1. Register at <https://africastalking.com>.
2. Create a **Sandbox** app (or go live when ready).
3. Copy the **API Key** and **Username** from the settings page.

---

## 4. Configure Environment Variables on Vercel

1. Install the Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Add env vars in the Vercel dashboard (**Settings → Environment Variables**) or via CLI:

```bash
vercel env add MONGODB_URI          # paste your Atlas connection string
vercel env add JWT_SECRET           # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
vercel env add REFRESH_TOKEN_SECRET # generate another random hex
vercel env add JWT_EXPIRE           # e.g. 15m
vercel env add REFRESH_TOKEN_EXPIRE # e.g. 7d
vercel env add RESEND_API_KEY       # from step 2
vercel env add AT_API_KEY           # from step 3
vercel env add AT_USERNAME          # from step 3
vercel env add MASTER_KEY           # a strong secret for admin bootstrap
vercel env add APP_URL              # https://futurepropertyholdings.vercel.app
vercel env add NODE_ENV             # production
vercel env add BCRYPT_ROUNDS        # 12
```

---

## 5. Deploy

```bash
vercel --prod
```

Vercel will:
- Run `vercel-build` (which is a no-op; no build step needed).
- Deploy `api/index.js` as a serverless function.
- Serve `index.html` and `public/*` as static assets.
- Apply the route rewrites in `vercel.json`.

Your site will be live at the printed URL (or your custom domain).

---

## 6. Bootstrap an Admin User

After deploy, run the admin bootstrap script locally (it connects to your Atlas DB):

```bash
# Create a local .env with at least MONGODB_URI and MASTER_KEY
MASTER_KEY=your_secret node scripts/create-admin.js
```

Follow the prompts to enter admin name, email, phone, and password.

---

## 7. Verify

| Check | How |
|-------|-----|
| Health | `curl https://your-domain.vercel.app/health` |
| Frontend | Open the URL in a browser — you should see the landing page |
| Register | Create a test tenant account |
| Login | Log in and verify the dashboard loads |
| Email | Check inbox for welcome + verification emails |
| Admin | Log in with the admin account created in step 6 |

---

## 8. Optional: Custom Domain

1. Go to **Vercel → Settings → Domains**.
2. Add your domain (e.g. `futurepropertyholdings.com`).
3. Update DNS as instructed (CNAME or A record).
4. Update `APP_URL` env var to the new domain.
5. Update `ALLOWED_ORIGINS` (comma-separated) to restrict allowed origins. `CORS_ORIGIN` is still supported as a legacy fallback.

---

## 9. CI/CD (GitHub Actions)

Push to GitHub and the `.github/workflows/ci.yml` will:
- Run tests on every PR (`node 18` and `20`).
- You can add a deploy step by connecting Vercel to your GitHub repo for automatic deploys on push to `main`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `MONGODB_URI not set` warning | Double-check env vars in Vercel dashboard |
| 500 on `/api/v1/auth/login` | Verify `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are set |
| Emails not sending | Check `RESEND_API_KEY`; verify domain if using custom sender |
| `app.js` 404 | `vercel.json` route `/app.js` → `/public/app.js` must exist |
| CSP blocks images | Images must come from `unsplash.com` or `self` |
