# Database Schema Reference — Future Property Holdings

Database: **MongoDB** (Mongoose ODM)

---

## Entity Relationship Diagram (Text)

```text
┌──────────┐       ┌───────────┐       ┌──────────────┐
│   User   │ 1───* │  Property │ 1───* │   Tenancy    │
│          │       │           │       │              │
│ _id      │       │ _id       │       │ _id          │
│ firstName│       │ name      │       │ tenant → User│
│ lastName │       │ landlord →│       │ landlord →   │
│ email    │       │   User    │       │ property →   │
│ phone    │       │ city      │       │ monthlyRent  │
│ password │       │ price     │       │ status       │
│ role     │       │ rooms     │       │ approvalStat │
│ biometric│       │ bathrooms │       └──────┬───────┘
│ ...      │       │ images[]  │              │
└────┬─────┘       │ isAvail   │              │ 1
     │             │ verific.  │              │
     │             └───────────┘              * 
     │                                  ┌─────┴──────────┐
     │ 1                                │  RentPayment   │
     │                                  │ _id            │
     * ──────────────────────────────── │ tenancy →      │
┌─────────────────┐                     │ amount         │
│  Maintenance    │                     │ amountPaid     │
│  Request        │                     │ dueDate        │
│ _id             │                     │ status         │
│ tenancy → Ten   │                     └────────────────┘
│ title           │
│ description     │                     ┌────────────────┐
│ category        │                     │   Inquiry      │
│ priority        │                     │ _id            │
│ status          │                     │ from → User    │
│ createdAt       │                     │ to → User      │
└─────────────────┘                     │ property →     │
                                        │ subject        │
                                        │ messages[]     │
                                        │ status         │
                                        └────────────────┘
```

---

## Collections

### 1. User

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| firstName | String | Yes | Min 2 chars |
| lastName | String | Yes | Min 2 chars |
| email | String | Yes | Unique, lowercase, validated regex |
| phone | String | Yes | Ghana format: `+233XXXXXXXXX` or `0XXXXXXXXX` |
| password | String | Yes | Bcrypt hashed, min 8 chars, `select: false` |
| role | Enum | No | `tenant` (default), `landlord`, `admin` |
| biometric.faceEnrolled | Boolean | No | Default `false` |
| biometric.faceData[] | Array | No | 128-d descriptor, timestamp, quality |
| biometric.ghanaCardVerified | Boolean | No | Default `false` |
| biometric.ghanaCardNumber | String | No | Format: `GHA-XXXXXXXXX-X` |
| isActive | Boolean | No | Default `true` |
| isEmailVerified | Boolean | No | Default `false` |
| emailVerificationToken | String | No | SHA-256 hashed |
| emailVerificationExpires | Date | No | 24h TTL |
| passwordResetToken | String | No | SHA-256 hashed |
| passwordResetExpires | Date | No | 1h TTL |
| loginAttempts | Number | No | Resets after lock expires |
| lockUntil | Date | No | 15 min lock after 5 failures |
| lastLogin | Date | No | Timestamp of last successful login |
| preferences | Object | No | notifications, newsletter, twoFactorAuth |

**Indexes:** `email` (unique), `biometric.ghanaCardNumber` (sparse), `createdAt` (desc)

---

### 2. Property

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | String | Yes | Property title |
| address | String | Yes | Street address |
| city | String | Yes | e.g. Accra, Kumasi |
| price | Number | Yes | Monthly rent in GHS |
| propertyType | Enum | Yes | apartment, house, studio, office, commercial |
| rooms | Number | Yes | Bedroom count |
| bathrooms | Number | Yes | Bathroom count |
| description | String | No | Free text |
| images[] | Array | No | `{ url, publicId }` |
| landlord | ObjectId | Yes | Ref → User |
| isAvailable | Boolean | No | Default `true` |
| verificationStatus | Enum | No | `pending`, `approved`, `rejected` |
| verificationNote | String | No | Admin rejection reason |

---

### 3. Tenancy

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| tenant | ObjectId | Yes | Ref → User |
| landlord | ObjectId | Yes | Ref → User |
| property | ObjectId | Yes | Ref → Property |
| monthlyRent | Number | Yes | Snapshot of agreed rent |
| status | Enum | No | `active`, `ended` |
| approvalStatus | Enum | No | `pending`, `active`, `rejected` |
| startDate | Date | No | Set when approved |
| endDate | Date | No | Set when ended |

---

### 4. RentPayment

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| tenancy | ObjectId | Yes | Ref → Tenancy |
| tenant | ObjectId | Yes | Ref → User |
| landlord | ObjectId | Yes | Ref → User |
| amount | Number | Yes | Invoice amount |
| amountPaid | Number | No | Running total paid |
| dueDate | Date | Yes | When payment is due |
| periodLabel | String | No | e.g. "June 2026" |
| status | Enum | No | `unpaid`, `partial`, `paid`, `overdue` |
| payments[] | Array | No | `{ amount, method, date, reference }` |

**Pre-save hook:** Automatically computes `status` from `amountPaid vs amount` and `dueDate`.

---

### 5. MaintenanceRequest

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| tenancy | ObjectId | Yes | Ref → Tenancy |
| tenant | ObjectId | Yes | Ref → User |
| title | String | Yes | Short summary |
| description | String | Yes | Detailed issue |
| category | Enum | No | plumbing, electrical, structural, general |
| priority | Enum | No | low, normal, high, urgent |
| status | Enum | No | `open`, `in_progress`, `resolved` |
| notes | String | No | Landlord/admin notes |

---

### 6. Inquiry

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| from | ObjectId | Yes | Ref → User (sender) |
| to | ObjectId | Yes | Ref → User (landlord) |
| property | ObjectId | Yes | Ref → Property |
| subject | String | No | First message as subject |
| messages[] | Array | No | `{ sender, body, createdAt }` |
| status | Enum | No | `open`, `replied`, `closed` |

---

## Relationship Summary

| From | To | Cardinality | Through |
|------|----|-------------|---------|
| User | Property | 1 → * | `property.landlord` |
| User | Tenancy | 1 → * | `tenancy.tenant` / `tenancy.landlord` |
| Property | Tenancy | 1 → * | `tenancy.property` |
| Tenancy | RentPayment | 1 → * | `rentPayment.tenancy` |
| Tenancy | MaintenanceRequest | 1 → * | `maintenanceRequest.tenancy` |
| User | Inquiry | 1 → * | `inquiry.from` / `inquiry.to` |
| Property | Inquiry | 1 → * | `inquiry.property` |
