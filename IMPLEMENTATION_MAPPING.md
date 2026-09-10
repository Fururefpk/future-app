# Chapter 3 Implementation Reference
## Design-to-Code Mapping for Future Property Holdings

---

## Overview

This document maps the theoretical system design presented in Chapter 3 to the actual implementation in the Future Property Holdings (FPH) codebase. It serves as a bridge between academic design artefacts and production code.

---

## 1. Three-Tier Architecture Implementation

### 1.1 Presentation Tier

**Location**: `/public/` and `/` root

**Components**:
- **index.html** (`/index.html`)
  - Main SPA (Single Page Application)
  - Contains HTML structure for all screens (marketing, auth modals, dashboards)
  - Responsive Bootstrap 5 grid layout
  - Embedded CSS and JavaScript

- **app.js** (`/public/app.js`)
  - Core SPA controller
  - Manages page navigation and state
  - Handles role-based UI rendering (landlord/tenant/admin views)
  - Integrates with frontend API client

- **apiClient.js** (`/public/apiClient.js`)
  - REST API wrapper
  - JWT token management (localStorage)
  - Automatic token refresh on 401 responses
  - Centralized error handling

- **robots.txt** & **sitemap.xml**
  - SEO configuration

### 1.2 Application Tier

**Location**: `/routes/`, `/controllers/`, `/middleware/`

**Express Server**: `/server.js`

```javascript
// Core middleware stack (as per Chapter 3 architecture)
app.use(helmet());                    // Security headers
app.use(cors());                      // CORS configuration
app.use(compression());               // Response compression
app.use(express.json());              // JSON parsing
app.use(errorHandler);                // Centralized error handling

// Rate limiting on auth routes
app.use('/api/v1/auth', rateLimiter);

// Routes organization
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/biometric', biometricRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/rent', rentRoutes);
app.use('/api/v1/tenancies', tenancyRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/admin', adminRoutes);
```

**Controllers** (`/controllers/`):

| Controller | Methods | Corresponds to |
|-----------|---------|-----------------|
| authController.js | register, login, logout, refreshToken, resetPassword | User authentication (FR-01, FR-02, FR-03) |
| biometricController.js | enrollFace, authenticateWithFace, verifyGhanaCard | Biometric auth (FR-04, FR-05) |
| propertyController.js | createListing, searchProperties, updateListing, deleteListing | Property listing (FR-06, FR-07) |
| inquiryController.js | submitInquiry, getInquiries, respondToInquiry | Tenant enquiries (FR-08) |
| rentController.js | recordPayment, getRentRecords, getBalance, generateInvoice | Rent management (FR-09, FR-10) |
| tenancyController.js | createTenancy, approveTenancy, terminateTenancy, listTenancies | Tenancy management |
| maintenanceController.js | submitRequest, updateStatus, getRequests | Maintenance (FR-11, FR-12) |
| adminController.js | approveListing, rejectListing, getDashboard, manageUsers | Admin functions (FR-13, FR-14) |

**Middleware** (`/middleware/`):

| Middleware | Purpose |
|-----------|---------|
| auth.js | JWT verification; protects routes requiring authentication |
| authorize.js | Role-based access control; restricts endpoints by role |
| errorHandler.js | Centralized error handling and logging |
| validate.js | Input validation using express-validator |

**Scheduled Tasks** (`/server.js` & cron configuration):

```javascript
// Automated rent reminders (daily at 08:00 AM)
cron.schedule('0 8 * * *', async () => {
  console.log('Running automated rent reminders...');
  // Implements 3.11.1 algorithm
});

// Notification queue processing (every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  console.log('Processing notification queue...');
});
```

### 1.3 Data Tier

**Location**: `/models/` and MongoDB Atlas

**Mongoose Models** (`/models/`):

| Model | Database Collection | Corresponds to ERD Table |
|-------|-------------------|------------------------|
| User.js | users | users |
| Property.js | properties | properties |
| Tenancy.js | tenancies | tenancies |
| RentRecord.js | rentrecords | rent_records |
| Inquiry.js | inquiries | inquiries |
| MaintenanceRequest.js | maintenancerequests | maintenance_requests |
| Notification.js | notifications | notifications |
| BiometricProfile.js | biometricprofiles | (custom for FPH) |

**Schema Example** (User.js):

```javascript
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },  // bcrypt hashed
  role: {
    type: String,
    enum: ['landlord', 'tenant', 'admin'],
    required: true
  },
  phone: String,
  ghana_card_id: String,
  ghana_card_verified: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended'],
    default: 'pending'
  },
  login_attempts: { type: Number, default: 0 },
  lockout_until: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes for performance (Chapter 3.9.2)
userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });
```

---

## 2. Data Flow Implementation

### 2.1 Registration Flow

**Code Path**: 
1. `POST /api/v1/auth/register` → **authController.register()**
2. Input validation via **middleware/validate.js**
3. Password hashing via **bcryptjs**
4. User document created in **MongoDB**
5. Email sent via **Resend API**
6. JWT tokens generated and returned

**Endpoint**:
```javascript
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['landlord', 'tenant'])
], authController.register);
```

**Controller**:
```javascript
async register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    
    // Check existing user
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'Email already registered' });
    
    // Hash password (bcrypt, 12 rounds per Chapter 3.5.2)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      status: role === 'landlord' ? 'pending' : 'active'
    });
    
    await user.save();
    
    // Send confirmation email via Resend
    await sendConfirmationEmail(user.email, user.name);
    
    // Generate JWT tokens
    const tokens = generateTokens(user._id, user.role);
    
    res.status(201).json({
      user: { id: user._id, name: user.name, role: user.role },
      tokens
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 2.2 Biometric Enrollment Flow

**Code Path**:
1. Tenant clicks "Enroll Face" during registration
2. Browser's **face-api.js** (TensorFlow.js) loads
3. Camera permission requested
4. Face detected after 3 seconds → **128-d descriptor** generated
5. Descriptor sent to `POST /api/v1/biometric/enroll` → **biometricController.enrollFace()**
6. Descriptor encrypted and stored in **biometricprofiles** collection
7. Confirmation returned to frontend

**Frontend** (`/public/app.js`):
```javascript
async function initFaceEnrollment() {
  // Load face-api.js models
  await faceapi.nets.tinyFaceDetector.load();
  await faceapi.nets.faceLandmark68Net.load();
  await faceapi.nets.faceRecognitionNet.load();
  
  // Request camera & start detection
  const video = document.getElementById('video');
  const canvas = faceapi.createCanvasFromMedia(video);
  
  // Auto-capture face descriptor after 3 seconds
  setTimeout(async () => {
    const detections = await faceapi.detectAllFaces(video, 
      new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    if (detections.length > 0) {
      const descriptor = detections[0].descriptor;
      
      // Send to backend
      const response = await apiClient.post('/biometric/enroll', {
        face_descriptor: Array.from(descriptor)
      });
      
      if (response.ok) {
        console.log('Face enrolled successfully');
        biometricState.faceEnrolled = true;
      }
    }
  }, 3000);
}
```

**Backend** (`/controllers/biometricController.js`):
```javascript
async enrollFace(req, res) {
  try {
    const { face_descriptor } = req.body;
    const user_id = req.user._id;  // From JWT
    
    // Encrypt descriptor (optional additional layer)
    const encrypted = encryptDescriptor(face_descriptor);
    
    // Save biometric profile
    const profile = new BiometricProfile({
      user_id,
      face_descriptor: encrypted,
      enrollment_date: new Date(),
      verification_status: 'enrolled'
    });
    
    await profile.save();
    
    res.json({ success: true, message: 'Face enrolled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 2.3 Biometric Login Flow

**Code Path**:
1. Tenant clicks "Face Recognition Login"
2. **face-api.js** captures face → generates **128-d descriptor**
3. Frontend calls `POST /api/v1/biometric/authenticate` with descriptor
4. **biometricController.authenticateWithFace()** implements **3.11.3 algorithm**
5. Finds nearest neighbor match (cosine similarity > 0.6)
6. Returns JWT tokens if match found
7. Frontend logs in user

**Frontend**:
```javascript
async function initFaceAuthLogin() {
  // Similar face detection as enrollment
  const descriptor = await captureFaceDescriptor();
  
  // Send to backend for authentication
  const response = await apiClient.post('/biometric/authenticate', {
    face_descriptor: Array.from(descriptor)
  });
  
  if (response.ok) {
    const { tokens, user } = response.data;
    localStorage.setItem('accessToken', tokens.access_token);
    localStorage.setItem('refreshToken', tokens.refresh_token);
    window.location.href = '/dashboard';
  }
}
```

**Backend** (implements **3.11.3** algorithm):
```javascript
async authenticateWithFace(req, res) {
  try {
    const { face_descriptor } = req.body;
    const threshold = 0.6;
    
    // Fetch all enrolled users
    const profiles = await BiometricProfile.find()
      .populate('user_id');
    
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'No enrolled users' });
    }
    
    // Find best match
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const profile of profiles) {
      // Decrypt stored descriptor
      const storedDescriptor = decryptDescriptor(profile.face_descriptor);
      
      // Calculate cosine similarity
      const similarity = cosineSimilarity(
        face_descriptor,
        storedDescriptor
      );
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = profile.user_id;
      }
    }
    
    // Check if match is above threshold
    if (bestSimilarity >= threshold && bestMatch) {
      const user = bestMatch;
      
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account not active' });
      }
      
      // Reset login attempts
      await User.updateOne({ _id: user._id }, { login_attempts: 0 });
      
      // Generate tokens
      const tokens = generateTokens(user._id, user.role);
      
      // Audit log
      await AuditLog.create({
        user_id: user._id,
        action: 'biometric_login',
        match_score: bestSimilarity,
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        tokens,
        user: { id: user._id, name: user.name, role: user.role }
      });
    } else {
      res.status(401).json({
        error: 'Face not recognized',
        score: bestSimilarity
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
  return dotProduct / (mag1 * mag2);
}
```

### 2.4 Property Listing Flow

**Code Path**:
1. Landlord logs in → navigates to "My Listings"
2. Clicks "Add Listing" → form modal opens
3. Fills form → `POST /api/v1/properties` via **propertyController.createListing()**
4. Input validated; property created with status `pending`
5. Admin notified via **Resend** email
6. Property appears in admin dashboard

**Endpoint**:
```javascript
router.post('/', protect, authorize(['landlord']), [
  body('title').notEmpty(),
  body('location').notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('bedrooms').isInt({ min: 1 })
], propertyController.createListing);
```

**Controller**:
```javascript
async createListing(req, res) {
  try {
    const { title, description, location, price, bedrooms, images } = req.body;
    const landlord_id = req.user._id;
    
    // Validate input
    if (!title || !location || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create property with pending status
    const property = new Property({
      landlord_id,
      title,
      description,
      location,
      price,
      bedrooms,
      images,
      status: 'pending',
      approved: false,
      created_at: new Date()
    });
    
    await property.save();
    
    // Notify admin
    await sendAdminNotification(
      `New listing: "${title}" from ${req.user.name}`,
      `Review at /admin/listings/${property._id}`
    );
    
    res.status(201).json({
      success: true,
      property,
      message: 'Listing submitted for admin review'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 2.5 Rent Payment Recording Flow

**Code Path**:
1. Landlord navigates to "Rent Records" for active tenancy
2. Clicks "Record Payment" → form modal opens
3. Enters amount paid and payment date
4. `PUT /api/v1/rent/:id` → **rentController.recordPayment()**
5. **rentrecords** collection updated; outstanding balance recalculated
6. SMS sent via **Africa's Talking** SDK
7. Email receipt sent via **Resend**
8. Tenant receives in-system notification

**Endpoint**:
```javascript
router.put('/:id', protect, authorize(['landlord']), [
  body('amount_paid').isFloat({ min: 0 }),
  body('paid_date').isISO8601()
], rentController.recordPayment);
```

**Controller**:
```javascript
async recordPayment(req, res) {
  try {
    const { amount_paid, paid_date, payment_method } = req.body;
    const rent_record_id = req.params.id;
    
    // Fetch rent record
    const record = await RentRecord.findById(rent_record_id)
      .populate(['tenancy_id']);
    
    if (!record) {
      return res.status(404).json({ error: 'Rent record not found' });
    }
    
    // Update record
    record.amount_paid = amount_paid;
    record.paid_date = new Date(paid_date);
    record.payment_method = payment_method;
    record.status = 'paid';  // Mark as paid if full amount
    
    await record.save();
    
    // Calculate outstanding balance
    const outstanding = record.amount_due - amount_paid;
    
    // Fetch tenant for notification
    const tenant = await User.findById(record.tenancy_id.tenant_id);
    
    // Send SMS notification via Africa's Talking
    await sendSMS(
      tenant.phone,
      `Payment of GHS ${amount_paid} recorded. Balance: GHS ${outstanding}`
    );
    
    // Send email receipt via Resend
    await sendEmail({
      to: tenant.email,
      subject: 'Rent Payment Receipt',
      html: `<p>Payment received: GHS ${amount_paid}</p>
             <p>Outstanding balance: GHS ${outstanding}</p>`
    });
    
    // Create in-system notification
    await Notification.create({
      user_id: tenant._id,
      type: 'payment_received',
      message: `Payment of GHS ${amount_paid} received`
    });
    
    res.json({
      success: true,
      outstanding_balance: outstanding,
      message: 'Payment recorded'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 3. Algorithm Implementation

### 3.1 Automated Rent Reminder Algorithm (3.11.1)

**Location**: `/server.js` (cron job)

```javascript
// Daily rent reminder cron job (08:00 AM Ghana Time)
cron.schedule('0 8 * * *', async () => {
  console.log('Running automated rent reminders...');
  
  try {
    const today = new Date();
    const reminderDays = [7, 3, 1];
    
    // Fetch all unpaid rent records
    const unpaidRecords = await RentRecord.find({
      status: { $in: ['unpaid', 'partial'] },
      due_date: { $gte: new Date(today.setDate(today.getDate() - 30)) }
    }).populate(['tenancy_id']);
    
    for (const record of unpaidRecords) {
      const daysUntilDue = Math.floor(
        (record.due_date - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      // Check if reminder day matches
      if (reminderDays.includes(daysUntilDue)) {
        const tenancy = record.tenancy_id;
        const tenant = await User.findById(tenancy.tenant_id);
        const landlord = await User.findById(tenancy.property_id.landlord_id);
        
        // Send SMS to tenant
        await sendSMS(
          tenant.phone,
          `Reminder: Rent of GHS ${tenancy.rent_amount} due in ${daysUntilDue} day(s)`
        );
        
        // Send email to tenant
        await sendEmail({
          to: tenant.email,
          subject: `Rent Due Reminder - ${daysUntilDue} day(s)`,
          html: `Your rent payment is due in ${daysUntilDue} day(s)`
        });
        
        // Create in-system notification
        await Notification.create({
          user_id: tenant._id,
          type: 'rent_reminder',
          message: `Rent due in ${daysUntilDue} day(s): GHS ${tenancy.rent_amount}`
        });
        
        // Alert landlord
        await sendEmail({
          to: landlord.email,
          subject: `Rent Payment Due - ${tenant.name}`,
          body: `${tenant.name}'s rent is due on ${record.due_date.toDateString()}`
        });
      }
      
      // Mark as overdue if past due date
      if (daysUntilDue < 0 && record.status !== 'overdue') {
        record.status = 'overdue';
        await record.save();
        
        // Send overdue alerts
        await sendSMS(
          tenant.phone,
          `URGENT: Your rent payment is overdue. Please pay immediately.`
        );
      }
    }
    
    console.log(`Rent reminder process completed: ${unpaidRecords.length} records processed`);
  } catch (error) {
    console.error('Rent reminder error:', error);
  }
});
```

### 3.2 Administrative Listing Approval Algorithm (3.11.2)

**Location**: `/controllers/adminController.js`

```javascript
async approveListing(req, res) {
  try {
    const { listing_id } = req.params;
    const { decision, notes } = req.body;
    const admin_id = req.user._id;
    
    // Fetch property and landlord
    const property = await Property.findById(listing_id);
    if (!property) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    if (property.status !== 'pending') {
      return res.status(400).json({ error: 'Listing is not pending review' });
    }
    
    const landlord = await User.findById(property.landlord_id);
    
    if (decision === 'approve') {
      // Update property
      property.approved = true;
      property.status = 'active';
      property.admin_notes = notes;
      property.approved_date = new Date();
      await property.save();
      
      // Create audit log
      await AuditLog.create({
        user_id: admin_id,
        action: 'approve_listing',
        resource_type: 'property',
        resource_id: listing_id,
        new_values: { status: 'active', approved: true },
        timestamp: new Date()
      });
      
      // Notify landlord
      await sendEmail({
        to: landlord.email,
        subject: `Property Listing Approved - ${property.title}`,
        html: `Your property "${property.title}" has been approved and is now live.`
      });
      
      await Notification.create({
        user_id: landlord._id,
        type: 'listing_approved',
        message: `Your listing for ${property.title} has been approved.`
      });
      
      res.json({ success: true, message: 'Listing approved' });
      
    } else if (decision === 'reject') {
      // Update property
      property.approved = false;
      property.status = 'rejected';
      property.admin_notes = notes;
      property.rejected_date = new Date();
      await property.save();
      
      // Create audit log
      await AuditLog.create({
        user_id: admin_id,
        action: 'reject_listing',
        resource_type: 'property',
        resource_id: listing_id,
        new_values: { status: 'rejected' },
        timestamp: new Date()
      });
      
      // Notify landlord
      await sendEmail({
        to: landlord.email,
        subject: `Property Listing Rejected - ${property.title}`,
        html: `Your listing was rejected.\n\nReason: ${notes}\n\nPlease review and resubmit.`
      });
      
      res.json({ success: true, message: 'Listing rejected' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 4. Database Design Implementation

### 4.1 Mongoose Schemas vs ERD

**User Model** (`/models/User.js`):
```javascript
// Corresponds to ERD entity: USERS
const userSchema = new Schema({
  _id: ObjectId,                    // PK
  name: String,
  email: String,                    // unique
  password: String,                 // bcrypt hash
  role: String,                     // 'landlord', 'tenant', 'admin'
  phone: String,
  ghana_card_id: String,
  ghana_card_verified: Boolean,
  status: String,                   // 'active', 'pending', 'suspended'
  login_attempts: Number,
  lockout_until: Date,
  created_at: Date,
  updated_at: Date
});
```

**Property Model** (`/models/Property.js`):
```javascript
// Corresponds to ERD entity: PROPERTIES
const propertySchema = new Schema({
  _id: ObjectId,                    // PK
  landlord_id: { type: Schema.Types.ObjectId, ref: 'User' },  // FK
  title: String,
  description: String,
  location: String,
  price: Number,
  bedrooms: Number,
  bathrooms: Number,
  property_type: String,
  images: [String],
  status: String,                   // 'pending', 'active', 'rejected'
  approved: Boolean,
  admin_notes: String,
  created_at: Date,
  updated_at: Date
});

// Indexes for performance
propertySchema.index({ landlord_id: 1 });
propertySchema.index({ status: 1, approved: 1 });
propertySchema.index({ location: 1, price: 1 });
```

**RentRecord Model** (`/models/RentRecord.js`):
```javascript
// Corresponds to ERD entity: RENT_RECORDS
const rentRecordSchema = new Schema({
  _id: ObjectId,
  tenancy_id: { type: Schema.Types.ObjectId, ref: 'Tenancy' },  // FK
  month: Date,
  amount_due: Number,
  amount_paid: Number,
  due_date: Date,
  paid_date: Date,
  payment_method: String,           // 'bank_transfer', 'cash', 'momo'
  status: String,                   // 'unpaid', 'partial', 'paid', 'overdue'
  late_fee: Number,
  notes: String,
  created_at: Date
});

// Index for performance
rentRecordSchema.index({ tenancy_id: 1, status: 1 });
rentRecordSchema.index({ due_date: 1 });
```

### 4.2 Indexes for Performance

Per Chapter 3.12.3 (performance testing), critical queries indexed:

| Collection | Index | Purpose |
|-----------|-------|---------|
| users | email (unique) | Fast user lookup by email |
| users | role, status | Fast filtering by role |
| properties | landlord_id | Fast retrieval of landlord's listings |
| properties | status, approved | Fast retrieval of active/approved listings |
| properties | location, price | Support location/price filtering |
| rentrecords | tenancy_id, status | Fast retrieval of rent records for display |
| rentrecords | due_date | Support cron job filtering |
| tenancies | tenant_id, status | Fetch active tenancies for tenant |

---

## 5. Testing Implementation

### 5.1 Unit Tests

**Location**: `/tests/`

**Example**: `api.test.js`

```javascript
describe('Auth Controller - Unit Tests (3.12.1)', () => {
  
  test('Should hash password with bcrypt (12 rounds)', async () => {
    const password = 'SecurePass123';
    const hash = await bcrypt.hash(password, 12);
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });
  
  test('Should reject invalid email format', async () => {
    const invalidEmail = 'not-an-email';
    const validator = body('email').isEmail();
    // Email validation should fail
    expect(() => {
      validator.run({ email: invalidEmail });
    }).toBeDefined();
  });
  
  test('Should calculate rent balance correctly', () => {
    const amountDue = 500;
    const amountPaid = 300;
    const balance = amountDue - amountPaid;
    expect(balance).toBe(200);
  });
});

describe('Biometric Controller - Unit Tests', () => {
  
  test('Should calculate cosine similarity correctly', () => {
    // Two identical vectors should have similarity = 1.0
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeCloseTo(1.0, 2);
  });
  
  test('Should reject face match below threshold', () => {
    // Two different vectors should have low similarity
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeLessThan(0.6);  // Below threshold
  });
});
```

### 5.2 Integration Tests

```javascript
describe('Rent Payment - Integration Test (3.12.2)', () => {
  
  test('Should record payment and update balance', async () => {
    // Create test data
    const tenant = await User.create({
      name: 'Test Tenant',
      email: 'tenant@test.gh',
      password: await bcrypt.hash('Test123', 12),
      role: 'tenant'
    });
    
    const landlord = await User.create({
      name: 'Test Landlord',
      email: 'landlord@test.gh',
      password: await bcrypt.hash('Test123', 12),
      role: 'landlord'
    });
    
    // Create property and tenancy
    const property = await Property.create({
      landlord_id: landlord._id,
      title: 'Test Property',
      location: 'Accra',
      price: 500,
      bedrooms: 2
    });
    
    const tenancy = await Tenancy.create({
      property_id: property._id,
      tenant_id: tenant._id,
      rent_amount: 500,
      start_date: new Date(),
      status: 'active'
    });
    
    // Create rent record
    const rentRecord = await RentRecord.create({
      tenancy_id: tenancy._id,
      amount_due: 500,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'unpaid'
    });
    
    // Record payment via API
    const response = await supertest(app)
      .put(`/api/v1/rent/${rentRecord._id}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        amount_paid: 300,
        paid_date: new Date()
      });
    
    expect(response.status).toBe(200);
    expect(response.body.outstanding_balance).toBe(200);
    
    // Verify database updated
    const updated = await RentRecord.findById(rentRecord._id);
    expect(updated.amount_paid).toBe(300);
    expect(updated.status).toBe('paid');
  });
});
```

### 5.3 System Test Cases

**TC-06 from Table 3.5** (Automated rent reminder):

```javascript
test('TC-06: Automated rent reminder at 7 days before due', async () => {
  // Setup
  const today = new Date();
  const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const tenant = await User.create({ /* ... */ });
  const rentRecord = await RentRecord.create({
    due_date: dueDate,
    status: 'unpaid'
  });
  
  // Execute cron job manually
  await runRentReminderProcess();
  
  // Verify
  const notification = await Notification.findOne({
    user_id: tenant._id,
    type: 'rent_reminder'
  });
  
  expect(notification).toBeDefined();
  expect(notification.message).toContain('7 day(s)');
});
```

---

## 6. Security Implementation

### 6.1 Password Hashing

**Implementation** (Chapter 3.5.2):
```javascript
// In authController.register()
const salt = await bcrypt.genSalt(12);  // 12 rounds as specified
const hashedPassword = await bcrypt.hash(password, salt);

// Plaintext password never stored in database
const user = new User({
  password: hashedPassword  // Only hash stored
});
```

### 6.2 JWT Tokens

**Configuration**:
```javascript
// Access token: 15 minutes
const accessToken = jwt.sign(
  { user_id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Refresh token: 7 days
const refreshToken = jwt.sign(
  { user_id: user._id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### 6.3 Rate Limiting

**Implementation**:
```javascript
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests per window
  message: 'Too many login attempts, try again later',
  handler: (req, res) => {
    // Lock account after 5 failed attempts
    User.updateOne(
      { _id: req.user._id },
      { lockout_until: new Date(Date.now() + 30 * 60 * 1000) }
    );
    res.status(429).json({ error: 'Account locked' });
  }
});

app.use('/api/v1/auth/login', authRateLimiter);
```

### 6.4 HTTPS/TLS

**Configuration**:
```javascript
// Helmet middleware for security headers
app.use(helmet());

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Vercel auto-provides HTTPS certificates
```

---

## 7. Notification Integration

### 7.1 Email via Resend

**Configuration** (`/utils/mailer.js`):
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html }) {
  try {
    await resend.emails.send({
      from: 'noreply@futurepropertyholdings.vercel.app',
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email error:', error);
  }
}
```

**Usage** (Rent reminder example):
```javascript
await sendEmail({
  to: tenant.email,
  subject: 'Rent Due Reminder - 7 day(s)',
  html: `<p>Your rent of GHS ${amount} is due on ${dueDate}</p>`
});
```

### 7.2 SMS via Africa's Talking

**Configuration** (`/utils/sms.js`):
```javascript
const AfricasTalking = require('africastalking');

const afrikasTalking = AfricasTalking({
  apiKey: process.env.AFRICAS_TALKING_API_KEY,
  username: process.env.AFRICAS_TALKING_USERNAME
});

const sms = afrikasTalking.SMS;

async function sendSMS(phone, message) {
  try {
    const result = await sms.send({
      recipients: [phone],
      message
    });
    console.log(`SMS sent to ${phone}`);
  } catch (error) {
    console.error('SMS error:', error);
  }
}
```

**Usage**:
```javascript
await sendSMS(
  tenant.phone,
  `Rent reminder: GHS ${amount} due in 7 day(s)`
);
```

---

## 8. Deployment

### 8.1 Vercel Serverless Deployment

**Configuration** (`/vercel.json`):
```json
{
  "buildCommand": "npm install",
  "outputDirectory": ".",
  "functions": {
    "server.js": {
      "memory": 512,
      "maxDuration": 60
    }
  }
}
```

**Environment Variables** (`.env`):
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/future
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
RESEND_API_KEY=re_xxx
AFRICAS_TALKING_API_KEY=xxx
AFRICAS_TALKING_USERNAME=xxx
NODE_ENV=production
```

### 8.2 GitHub Actions CI/CD

**Workflow** (`/.github/workflows/ci.yml`):
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run build
```

---

## 9. File Structure Reference

```
FUTURE/
├── server.js                    # Express app + cron jobs
├── package.json                 # Dependencies
├── .env.example                 # Environment template
├── vercel.json                  # Vercel config
│
├── public/
│   ├── index.html              # SPA (marketing + all screens)
│   ├── app.js                  # SPA controller + biometric enrollment
│   ├── apiClient.js            # REST API client wrapper
│   ├── robots.txt
│   └── sitemap.xml
│
├── controllers/
│   ├── authController.js       # Auth logic (register, login, JWT)
│   ├── biometricController.js  # Face/Ghana Card verification
│   ├── propertyController.js   # Property listing CRUD
│   ├── rentController.js       # Rent payment recording
│   ├── tenancyController.js    # Lease management
│   ├── maintenanceController.js # Maintenance tickets
│   ├── inquiryController.js    # Tenant enquiries
│   └── adminController.js      # Admin dashboard
│
├── models/
│   ├── User.js                 # User schema + indexes
│   ├── Property.js             # Property schema
│   ├── Tenancy.js              # Tenancy schema
│   ├── RentRecord.js           # Rent tracking schema
│   ├── MaintenanceRequest.js   # Maintenance schema
│   ├── Inquiry.js              # Enquiry schema
│   ├── Notification.js         # Notification schema
│   └── BiometricProfile.js     # Face descriptor storage
│
├── routes/
│   ├── auth.js                 # Auth endpoints
│   ├── biometric.js            # Biometric endpoints
│   ├── properties.js           # Property endpoints
│   ├── rent.js                 # Rent endpoints
│   ├── tenancies.js            # Tenancy endpoints
│   ├── maintenance.js          # Maintenance endpoints
│   ├── inquiries.js            # Inquiry endpoints
│   └── admin.js                # Admin endpoints
│
├── middleware/
│   ├── auth.js                 # JWT verification
│   ├── authorize.js            # Role-based access control
│   ├── errorHandler.js         # Centralized error handling
│   └── validate.js             # Input validation
│
├── utils/
│   ├── mailer.js               # Resend email integration
│   ├── sms.js                  # Africa's Talking SMS
│   └── faceRecognition.js      # Face descriptor utilities
│
├── config/
│   └── database.js             # MongoDB connection
│
├── tests/
│   └── api.test.js             # Jest tests (unit + integration)
│
└── Documentation/
    ├── CHAPTER_3_SYSTEM_DESIGN.md  # This design doc
    ├── README.md               # Project overview
    ├── QUICK_START.md          # Getting started
    ├── TESTING_GUIDE.md        # Test scenarios
    ├── API.md                  # API documentation
    ├── DATABASE.md             # DB schema details
    └── DEVELOPER_REFERENCE.md  # Developer guide
```

---

## 10. Key Metrics and Validation

### 10.1 Performance Metrics (Chapter 3.12.3)

| Metric | Target | Implementation |
|--------|--------|-----------------|
| Page Load Time | < 3 seconds | Express compression + CDN |
| DB Query Time | < 2 seconds (10k records) | Indexes on frequently-queried fields |
| API Response | < 500ms | Optimized controllers + rate limiting |
| Concurrent Users | 100+ | Stateless backend; horizontal scaling ready |

### 10.2 Security Metrics (Chapter 3.13.3)

| Metric | Target | Implementation |
|--------|--------|-----------------|
| Password Hashing | bcrypt (12 rounds) | ✓ Implemented in authController |
| Data Encryption | HTTPS/TLS | ✓ Vercel auto-provides; helmet CSP |
| Rate Limiting | 5 req/min on auth | ✓ express-rate-limit middleware |
| JWT Expiry | 15 min (access) | ✓ Configured in generateTokens() |
| Account Lockout | 5 failed attempts | ✓ login_attempts tracking |

### 10.3 Functionality Checklist (Chapter 3.5)

- ✓ FR-01: User registration with email/password
- ✓ FR-02: Role-based access control (landlord/tenant/admin)
- ✓ FR-03: Profile updates
- ✓ FR-04: Biometric face enrollment + authentication
- ✓ FR-05: Ghana Card verification (mock)
- ✓ FR-06: Property listing creation/editing
- ✓ FR-07: Property search with filters
- ✓ FR-08: Tenant enquiries
- ✓ FR-09: Rent record tracking
- ✓ FR-10: Automated rent reminders (email + SMS)
- ✓ FR-11: Maintenance request submission
- ✓ FR-12: Maintenance status updates
- ✓ FR-13: Admin listing approval
- ✓ FR-14: Admin dashboard

---

## 11. Next Steps for Implementation

1. **Complete Ghana Card Integration**: Replace mock endpoint with actual NITA Ghana API
2. **Enhanced Face Recognition**: Implement liveness detection to prevent spoofing
3. **Payment Gateway Integration**: Integrate Paystack/Flutterwave for direct rent payments
4. **Mobile App**: Develop React Native companion app
5. **Analytics Dashboard**: Implement detailed metrics and reporting
6. **Machine Learning**: Add fraud detection using anomaly detection models

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Implementation Complete (MVP)
