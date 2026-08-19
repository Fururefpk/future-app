# 🏢 Future Property Holdings (FPH)

Ghana's verified property rental platform — connecting landlords and tenants with biometric identity verification (Ghana Card + face recognition).

---

## ✨ Features

| Feature | Details |
|---|---|
| Auth | Email/password, passkeys (WebAuthn), social OAuth, face recognition login |
| Verification | Ghana Card submission + face enrollment → admin review queue |
| Properties | Listings with images (Cloudinary), search, filter, featured |
| Tenancies | Request → approve/reject → active → end lifecycle |
| Rent | Invoice generation, Mobile Money / bank payment recording, PDF |
| Maintenance | Issue reporting with photos, priority, technician assignment |
| Inquiries | Property messaging system with real-time-style replies |
| Admin | Full dashboard, user management, audit log, verification queue |
| Security | JWT + refresh tokens, rate limiting, XSS/NoSQL sanitisation, helmet |
| PWA | Installable, offline-capable via service worker |

---

## 🗂️ Project Structure

```
fph/
├── frontend/                 ← Static HTML/CSS/JS frontend
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── config.js         ← API URL, Session helpers, Demo mode
│       ├── app.js            ← Init, toast, carousel
│       ├── auth.js           ← Login, register, logout, passkey
│       ├── biometric.js      ← Face capture, Ghana Card (Settings)
│       └── dashboard.js      ← Dashboard, settings, verification UI
│
├── public/                   ← Static assets served at root
│   ├── manifest.json         ← PWA manifest
│   ├── sw.js                 ← Service worker
│   ├── robots.txt
│   ├── sitemap.xml
│   └── 404.html
│
├── api/index.js              ← Vercel serverless entry point
├── server.js                 ← Express app
├── package.json
├── vercel.json               ← Vercel routing + headers
├── .env.example              ← Copy to .env
│
├── config/
│   └── database.js           ← MongoDB connection + health check
│
├── middleware/
│   ├── auth.js               ← JWT protect, authorize, guards
│   └── upload.js             ← Cloudinary + Multer
│
├── models/
│   ├── User.js
│   ├── Property.js
│   ├── Tenancy.js
│   ├── Invoice.js
│   ├── Inquiry.js
│   ├── Maintenance.js
│   ├── Biometric.js          ← Verification audit trail
│   └── AuditLog.js
│
├── controllers/
│   ├── authController.js
│   ├── propertyController.js
│   ├── tenancyController.js
│   ├── rentController.js
│   ├── maintenanceController.js
│   ├── inquiryController.js
│   ├── userController.js
│   ├── biometricController.js
│   └── adminController.js
│
├── routes/
│   ├── auth.js
│   ├── properties.js
│   ├── tenancies.js
│   ├── rent.js
│   ├── maintenance.js
│   ├── inquiries.js
│   ├── users.js
│   ├── biometric.js
│   └── admin.js
│
└── utils/
    ├── email.js              ← Nodemailer transactional emails
    └── tokenHelper.js        ← JWT sign/verify, opaque token utils
```

---

## 🚀 Local Development

### 1. Clone and install
```bash
git clone https://github.com/yourname/future-property-holdings.git
cd future-property-holdings
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in MongoDB URI, JWT secrets, Cloudinary, SMTP
```

### 3. Start the backend
```bash
npm run dev
# Server starts at http://localhost:5000
# API available at http://localhost:5000/api/v1
```

### 4. Open the frontend
Open `frontend/index.html` in your browser, or use a static server:
```bash
npx serve . -p 3000
# Open http://localhost:3000
```

> **No backend running?** The app automatically falls back to **Demo mode** — register and log in fully without a server. Data is stored in localStorage.

---

## ☁️ Deploy to Vercel

### One-click deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual steps

1. Push to GitHub
2. Import repo in [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` | [MongoDB Atlas](https://cloud.mongodb.com) → Connect |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `REFRESH_TOKEN_SECRET` | Same as above (different value) |
| `CLOUDINARY_CLOUD_NAME` | [cloudinary.com](https://cloudinary.com) → Dashboard |
| `CLOUDINARY_API_KEY` | Same dashboard |
| `CLOUDINARY_API_SECRET` | Same dashboard |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password (Settings → Security → App passwords) |
| `FRONTEND_URL` | Your Vercel URL e.g. `https://fph.vercel.app` |
| `ALLOWED_ORIGINS` | Same Vercel URL |

4. Deploy — done ✓

---
## 🔐 Creator Account

The creator account is automatically seeded when `CREATOR_EMAIL` and `CREATOR_PASSWORD` are set.

What it provides:
- `role: admin`
- `secondaryRoles: ['landlord']`
- `isCreator: true`
- `verification.status: verified`

How it works:
- `utils/seedCreator.js` runs on every server start and ensures the creator account exists.
- If the creator account already exists, the seed fixes any mismatched flags on restart.
- On login, `controllers/authController.js` re-applies creator flags for the matching email so tokens always carry the creator identity.
- `middleware/auth.js` short-circuits `authorize()` and `requireVerified()` for `req.user.isCreator`, giving the account full access across landlord, admin, and verification-protected routes.

Setup:
1. Copy `.env.example` to `.env`.
2. Set `CREATOR_EMAIL` and `CREATOR_PASSWORD` to your own values.
3. Optionally set `CREATOR_FIRST_NAME` and `CREATOR_LAST_NAME`.
4. Run `npm run dev`.

On local dev you will see the full combined dashboard when you log in with the creator email:
- **My Account** section: listings, tenancies, rent, maintenance, inquiries
- **Administration** section: properties, users, verifications, audit log

For Vercel, add the same variables in your project settings and ensure `vercel.json` references them as secrets.

---
## 🔑 API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register (personal info only) |
| POST | `/api/v1/auth/login` | — | Login |
| POST | `/api/v1/auth/refresh-token` | — | Refresh access token |
| POST | `/api/v1/auth/logout` | ✓ | Logout |
| GET  | `/api/v1/properties` | — | Browse listings |
| POST | `/api/v1/properties` | landlord | Create listing |
| POST | `/api/v1/biometric/verify-ghana-card` | ✓ | Submit Ghana Card |
| POST | `/api/v1/biometric/enroll-face` | ✓ | Enroll face descriptor |
| GET  | `/api/v1/biometric/status` | ✓ | Verification status |
| GET  | `/api/v1/admin/dashboard` | admin | Admin overview |
| GET  | `/health` | — | Server health check |

Full API reference: see individual `routes/*.js` files.

---

## 🛡️ Security

- Passwords hashed with **bcrypt** (12 rounds)
- JWTs with 15-minute access tokens + 7-day refresh tokens
- Refresh tokens stored **hashed** in MongoDB
- Rate limiting on all auth endpoints
- MongoDB query sanitisation (`express-mongo-sanitize`)
- XSS cleaning (`xss-clean`)
- Security headers (`helmet`)
- CORS restricted to configured origins

---

## 📱 PWA

The app is installable as a Progressive Web App:
- Add to Home Screen on mobile
- Works offline (static assets cached by service worker)
- API calls retry from cache when offline

---

## 📄 License

MIT — Future Property Holdings © 2025