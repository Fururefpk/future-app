# FPH Operations Guide

## Fast local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run check:env
npm test
npm run dev
```

The local API runs at `http://localhost:5000`.

## Daily commands

| Command | Purpose |
|---|---|
| `npm run check:env` | Validate required local environment variables |
| `npm run db:status` | Check MongoDB connectivity and latency |
| `npm test` | Run the API test suite |
| `npm run test:watch` | Re-run tests while editing |
| `npm run test:coverage` | Generate coverage output |
| `npm run smoke -- http://localhost:5000` | Check health, frontend, and public properties |
| `npm run perf -- https://your-app.vercel.app` | Measure `/health` latency |
| `npm run check` | Environment validation, tests, and production audit |

## Seed development data

Seeding is development-only and requires explicit confirmation:

```powershell
$env:SEED_CONFIRM='I_UNDERSTAND'
$env:SEED_PASSWORD='Use-a-local-password'
$env:SEED_LANDLORD_EMAIL='landlord.demo@example.com'
$env:SEED_TENANT_EMAIL='tenant.demo@example.com'
npm run db:seed
```

The seed is idempotent for the demo users and the `Demo Accra Apartment` listing. It refuses to run with `NODE_ENV=production`.

## Production verification

After deployment:

```powershell
curl.exe https://your-app.vercel.app/health
npm run smoke -- https://your-app.vercel.app
npm run perf -- https://your-app.vercel.app
```

Expected health output includes `status: "OK"` and `database.status: "connected"`.

## Deployment checklist

1. Rotate credentials that have ever been exposed.
2. Set Production environment variables in Vercel; do not commit `.env` files.
3. Run `npm run check` locally.
4. Deploy with `vercel --prod --yes`.
5. Run the production smoke checks.
6. Test registration, login, dashboard, logout, and one protected API route.
7. Review Vercel logs for runtime errors.

## Troubleshooting

- `querySrv ECONNREFUSED`: check local DNS, VPN, firewall, or network access to Atlas.
- `auth required`: verify the Atlas database user and the Production `MONGODB_URI`.
- `Database temporarily unavailable`: inspect Vercel logs and Atlas Network Access.
- `Not authorized` in Vercel: confirm the active account/team and linked project.
