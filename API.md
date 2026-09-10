# API Reference — Future Property Holdings

Base URL: `/api/v1`

All protected routes require header: `Authorization: Bearer <accessToken>`

---

## Authentication (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Create a new tenant or landlord account |
| POST | `/auth/login` | Public | Authenticate with email + password |
| POST | `/auth/biometric-login` | Public | Authenticate with face descriptor |
| POST | `/auth/refresh-token` | Public | Exchange refresh token for new access token |
| POST | `/auth/forgot-password` | Public | Send password-reset email |
| POST | `/auth/reset-password/:token` | Public | Set a new password using reset token |
| GET | `/auth/verify-email/:token` | Public | Verify email address (redirects to app) |
| POST | `/auth/logout` | Protected | Invalidate the current session |
| GET | `/auth/me` | Protected | Get the authenticated user's profile |

### POST `/auth/register`

```json
{
  "firstName": "Kwame",
  "lastName": "Asante",
  "email": "kwame@example.com",
  "phone": "+233241234567",
  "password": "MyP@ss123",
  "role": "tenant"  // or "landlord"
}
```

### POST `/auth/login`

```json
{
  "email": "kwame@example.com",
  "password": "MyP@ss123"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "user": { "firstName": "Kwame", "lastName": "Asante", "email": "...", "role": "tenant", ... },
    "accessToken": "eyJhb...",
    "refreshToken": "eyJhb..."
  }
}
```

---

## Properties (`/properties`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/properties` | Public | List all approved properties (supports `?type=`, `?limit=`) |
| GET | `/properties/:id` | Public | Get single property by ID |
| GET | `/properties/user/:userId` | Public | Get a landlord's listings |
| POST | `/properties` | Landlord/Admin | Create a new property listing |
| PUT | `/properties/:id` | Owner | Update own property |
| DELETE | `/properties/:id` | Owner | Delete own property |

### POST `/properties`

```json
{
  "name": "3-Bed Executive Apartment",
  "address": "12 Independence Ave",
  "city": "Accra",
  "price": 3500,
  "propertyType": "apartment",
  "rooms": 3,
  "bathrooms": 2,
  "description": "Modern apartment with parking."
}
```

---

## Users (`/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/:id` | Public | Get user public profile |
| PUT | `/users/profile` | Protected | Update own profile (firstName, lastName, phone) |
| PUT | `/users/password` | Protected | Change password |
| DELETE | `/users/account` | Protected | Deactivate own account |
| GET | `/users` | Admin | List all users |
| GET | `/users/stats/overview` | Admin | User statistics |

---

## Tenancies (`/tenancies`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tenancies/me` | Protected | My tenancies (tenant or landlord) |
| GET | `/tenancies/:id` | Protected | Get tenancy by ID |
| POST | `/tenancies` | Verified | Request a tenancy (tenant applies) |
| PATCH | `/tenancies/:id/decision` | Landlord | Approve or reject (`{ "decision": "active" | "rejected" }`) |
| PATCH | `/tenancies/:id/end` | Protected | End a tenancy |

---

## Rent & Invoices (`/rent`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/rent/me` | Protected | My invoices |
| GET | `/rent/reminders` | Protected | Upcoming due reminders |
| POST | `/rent/invoices` | Landlord | Generate invoice for a tenancy |
| POST | `/rent/invoices/:id/payments` | Protected | Record a payment |

### POST `/rent/invoices`

```json
{ "tenancyId": "64f..." }
```

---

## Maintenance (`/maintenance`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/maintenance/me` | Protected | My maintenance requests |
| POST | `/maintenance` | Verified | Create maintenance request |
| PATCH | `/maintenance/:id` | Protected | Update status/notes |

### POST `/maintenance`

```json
{
  "tenancyId": "64f...",
  "title": "Leaking kitchen pipe",
  "description": "Water dripping from under the sink.",
  "category": "plumbing",
  "priority": "high"
}
```

---

## Inquiries (`/inquiries`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/inquiries/me` | Protected | My inquiries |
| GET | `/inquiries/:id` | Protected | Get inquiry by ID |
| POST | `/inquiries` | Verified | Send inquiry to landlord |
| POST | `/inquiries/:id/reply` | Protected | Reply to inquiry |
| PATCH | `/inquiries/:id/close` | Protected | Close inquiry |

---

## Biometric (`/biometric`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/biometric/enroll-face` | Protected | Enroll 128-d face descriptor |
| POST | `/biometric/re-enroll-face` | Protected | Re-enroll face data |
| POST | `/biometric/verify-ghana-card` | Protected | Submit Ghana Card for verification |
| GET | `/biometric/status` | Protected | Get biometric verification status |
| DELETE | `/biometric/face` | Protected | Delete face data |

---

## Admin (`/admin`)

All admin routes require `role: 'admin'`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Platform-wide stats (users, properties, tenancies, rent, maintenance) |
| GET | `/admin/properties/pending` | Properties awaiting approval |
| PATCH | `/admin/properties/:id/review` | Approve/reject (`{ "decision": "approved" | "rejected", "reason": "..." }`) |
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/:id/active` | Enable/disable user (`{ "isActive": true | false }`) |

---

## Error Format

All errors follow:
```json
{
  "success": false,
  "message": "Human-readable error",
  "error": {}  // detailed info in dev mode only
}
```

## Rate Limits

| Scope | Limit |
|-------|-------|
| Global `/api/*` | 100 req / 15 min |
| Auth (login, register, forgot, reset) | 5 req / 1 min |
