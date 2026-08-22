# Production Setup Guide - Future Property Holdings

## Table of Contents
1. [Backend Deployment](#backend-deployment)
2. [Database Configuration](#database-configuration)
3. [Face Recognition Integration](#face-recognition-integration)
4. [Security & HTTPS](#security--https)
5. [Environment Variables](#environment-variables)
6. [Docker Deployment](#docker-deployment)
7. [Monitoring & Logging](#monitoring--logging)
8. [API Documentation](#api-documentation)
9. [Troubleshooting](#troubleshooting)

---

## Backend Deployment

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB >= 4.4 (local or Atlas)
- Git for version control

### Installation Steps

#### 1. Clone Repository
```bash
git clone <repository-url>
cd future-property-holdings
```

#### 2. Install Dependencies
```bash
npm install
```

This installs:
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **bcryptjs**: Password encryption
- **jsonwebtoken**: JWT authentication
- **dotenv**: Environment variables
- **cors**: Cross-origin requests
- **helmet**: Security headers
- **express-validator**: Input validation
- **multer**: File uploads
- **compression**: Response compression
- **express-rate-limit**: Rate limiting

#### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables) section).

#### 4. Start Development Server
```bash
npm run dev
```

Server will start on `http://localhost:5003`

#### 5. Start Production Server
```bash
npm start
```

---

## Database Configuration

### MongoDB Setup

#### Option A: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with strong password
4. Whitelist your IP address
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/future_properties?retryWrites=true&w=majority`
6. Update `.env` with `MONGODB_URI`

#### Option B: Local MongoDB Installation

**Windows:**
```bash
# Using Chocolatey
choco install mongodb-community

# Start MongoDB
net start MongoDB

# Verify connection
mongosh
```

**macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection
mongosh
```

**Linux (Ubuntu/Debian):**
```bash
# Install MongoDB
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb

# Verify connection
mongosh
```

#### Connection String for Local
```
mongodb://localhost:27017/future_properties
```

### Database Schema

The application uses 4 main collections:

#### 1. Users Collection
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String (unique),
  phone: String,
  password: String (bcrypt hashed),
  role: String ('tenant', 'landlord', 'admin'),
  profileImage: String,
  bio: String,
  biometric: {
    faceEnrolled: Boolean,
    faceData: [{
      timestamp: Date,
      descriptor: [Number] (128D array),
      quality: Number
    }],
    ghanaCardVerified: Boolean,
    ghanaCardNumber: String (format: GHA-XXXXXXXXX-X),
    ghanaCardName: String,
    biometricVerifiedAt: Date
  },
  isActive: Boolean,
  isEmailVerified: Boolean,
  loginAttempts: Number,
  lockUntil: Date,
  lastLogin: Date,
  lastLoginIP: String,
  preferences: {
    notifications: Boolean,
    newsletter: Boolean,
    twoFactorAuth: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Properties Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  address: String,
  city: String,
  price: Number,
  rooms: Number,
  bathrooms: Number,
  propertyType: String,
  landlord: ObjectId (ref: User),
  images: [{url: String, uploadedAt: Date}],
  isAvailable: Boolean,
  amenities: [String],
  rules: String,
  averageRating: Number,
  reviews: [{
    reviewer: ObjectId,
    rating: Number,
    comment: String,
    createdAt: Date
  }],
  contactPhone: String,
  contactEmail: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. Sessions Collection (Optional)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  token: String,
  refreshToken: String,
  expiresAt: Date,
  createdAt: Date
}
```

---

## Face Recognition Integration

### Current Implementation
- **Status**: Simulated face detection in `utils/faceRecognition.js`
- **Method**: Generates random 128-dimensional descriptors
- **Purpose**: Proof of concept and API integration testing

### Production Face Recognition

#### Option A: face-api.js (Recommended)

**Installation:**
```bash
npm install face-api.js @tensorflow/tfjs @tensorflow/tfjs-core @tensorflow/tfjs-backend-webgl
```

**Backend Integration:**
```javascript
// controllers/biometricController.js
const faceApi = require('face-api.js');
const sharp = require('sharp');

exports.extractFaceFeatures = async (imageBuffer) => {
  // Load image
  const img = await sharp(imageBuffer)
    .png()
    .toBuffer();
  
  // Detect face and extract descriptor
  const detections = await faceApi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors();
  
  if (detections.length === 0) {
    throw new Error('No face detected');
  }
  
  return {
    descriptor: detections[0].descriptor,
    quality: calculateQuality(detections[0]),
    landmarks: detections[0].landmarks
  };
};
```

**Frontend Integration:**
```javascript
// Add to frontend HTML
<script async defer src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3"></script>
<script async defer src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>

// Load models
const MODEL_URL = '/models/face-api-models/';

async function initFaceRecognition() {
  await faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
}
```

**Download Models:**
```bash
# Create models directory
mkdir -p public/models/face-api-models

# Download from: 
# https://github.com/vladmandic/face-api/tree/master/model/
```

#### Option B: TensorFlow.js with Face Detection

```bash
npm install @tensorflow/tfjs @tensorflow-models/blazeface
```

#### Matching Algorithm

```javascript
// utils/faceRecognition.js
function computeDistance(descriptor1, descriptor2) {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Threshold: 0.6 (distance < 0.6 = match)
// Adjust based on your accuracy requirements
```

### Quality Metrics

| Metric | Minimum | Recommended |
|--------|---------|-------------|
| Face Detection Confidence | 0.5 | > 0.8 |
| Image Quality Score | 40 | > 70 |
| Face Area (% of image) | 20% | > 40% |
| Face Frontality | 30° | < 15° |

---

## Security & HTTPS

### SSL Certificate Setup

#### Option A: Let's Encrypt (Free - Recommended)

**Using Certbot:**
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificate location
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Auto-renewal:**
```bash
# Check renewal
sudo certbot renew --dry-run

# Set cron job
0 0 * * * /usr/bin/certbot renew --quiet
```

#### Option B: Self-Signed Certificate (Development Only)

```bash
# Generate self-signed cert for 365 days
openssl req -x509 -newkey rsa:4096 -keyout private-key.pem -out certificate.pem -days 365 -nodes
```

### Environment Configuration
```env
# .env
USE_HTTPS=true
SSL_KEY_PATH=/path/to/private-key.pem
SSL_CERT_PATH=/path/to/certificate.pem
```

### Security Headers (via Helmet)
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

### Password Security

**bcryptjs Configuration:**
```env
BCRYPT_ROUNDS=12  # Higher = more secure but slower
```

**Hashing Example:**
```javascript
const bcrypt = require('bcryptjs');
const salt = await bcrypt.genSalt(12);
const hashedPassword = await bcrypt.hash(password, salt);
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # Max requests per window
```

### JWT Security
```env
JWT_SECRET=minimum_32_character_random_string_here
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=another_minimum_32_character_string
REFRESH_TOKEN_EXPIRE=30d
```

**Generate Strong Secret:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Environment Variables

### Complete .env Template

```env
# ============ APPLICATION ============
NODE_ENV=production
PORT=5003
HOST=0.0.0.0
API_BASE_URL=https://yourdomain.com/api/v1

# ============ DATABASE ============
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/future_properties
DB_NAME=future_properties

# ============ AUTHENTICATION ============
JWT_SECRET=your_super_secret_key_minimum_32_characters_recommended
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=another_super_secret_key_minimum_32_characters
REFRESH_TOKEN_EXPIRE=30d
BCRYPT_ROUNDS=12

# ============ SECURITY ============
SESSION_SECRET=your_session_secret_key
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15m

# ============ HTTPS ============
USE_HTTPS=true
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem

# ============ FACE RECOGNITION ============
FACE_API_MODEL_PATH=./public/models/face-api-models/
FACE_DETECTION_CONFIDENCE=0.5
FACE_MATCHING_THRESHOLD=0.6

# ============ CORS ============
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# ============ RATE LIMITING ============
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# ============ FILE UPLOAD ============
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# ============ EMAIL (Optional - for password reset) ============
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@futurepropertyholdings.com

# ============ LOGGING ============
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Security Best Practices
- ✅ Never commit `.env` to version control
- ✅ Add `.env` to `.gitignore`
- ✅ Use strong, random secrets (min 32 characters)
- ✅ Rotate secrets periodically
- ✅ Use environment-specific .env files for each deployment
- ✅ Store in password manager or secure vault (AWS Secrets Manager, etc.)

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 5003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5003/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5003:5003"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/future_properties
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo
    volumes:
      - ./logs:/app/logs
      - ./public:/app/public
    networks:
      - future-network

  mongo:
    image: mongo:6.0
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
      - MONGO_INITDB_DATABASE=future_properties
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - future-network

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - future-network

volumes:
  mongo-data:

networks:
  future-network:
```

### Deploy with Docker
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

---

## Monitoring & Logging

### Application Logging
```javascript
// middleware/logger.js
const fs = require('fs');
const path = require('path');

const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });

app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`;
  console.log(log);
  logFile.write(log + '\n');
  next();
});
```

### Error Tracking (Sentry)

**Installation:**
```bash
npm install @sentry/node @sentry/tracing
```

**Integration:**
```javascript
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/12345",
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... routes ...

app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring

**Response Time Tracking:**
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});
```

---

## API Documentation

### Authentication Endpoints

#### Register User
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+233501234567",
  "password": "SecurePass123!",
  "role": "tenant"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {...},
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Biometric Login (Face Recognition)
```
POST /api/v1/auth/biometric-login
Content-Type: application/json
Authorization: Bearer <token_optional_for_face_only>

{
  "userEmail": "john@example.com",
  "faceDescriptor": [0.123, 0.456, ..., 0.789]  // 128-dim array
}

Response:
{
  "success": true,
  "message": "Biometric login successful",
  "data": {
    "user": {...},
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "confidence": 95.5
  }
}
```

### Biometric Endpoints

#### Enroll Face
```
POST /api/v1/biometric/enroll-face
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "faceDescriptor": [0.123, 0.456, ..., 0.789],  // 128-dim array
  "imageQuality": 85
}

Response:
{
  "success": true,
  "message": "Face enrolled successfully",
  "data": {
    "faceEnrolled": true,
    "enrolledFaces": 1
  }
}
```

#### Verify Ghana Card
```
POST /api/v1/biometric/verify-ghana-card
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ghanaCardNumber": "GHA-123456789-0",
  "ghanaCardName": "John Doe"
}

Response:
{
  "success": true,
  "message": "Ghana Card verified successfully",
  "data": {
    "ghanaCardVerified": true,
    "cardLastDigits": "0"
  }
}
```

#### Get Biometric Status
```
GET /api/v1/biometric/status
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "data": {
    "faceEnrolled": true,
    "enrolledFaces": 1,
    "ghanaCardVerified": true,
    "ghanaCardLastDigits": "0",
    "biometricVerifiedAt": "2024-03-15T10:30:00Z"
  }
}
```

### Property Endpoints

#### Get All Properties
```
GET /api/v1/properties?page=1&limit=10&city=Accra&minPrice=500&maxPrice=5000

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Beautiful Apartment",
      "price": 2500,
      "city": "Accra",
      "rooms": 2,
      "bathrooms": 1,
      "landlord": {...}
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 45
  }
}
```

#### Create Property
```
POST /api/v1/properties
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Modern House",
  "description": "Beautiful 3-bedroom house",
  "address": "123 Main Street",
  "city": "Kumasi",
  "price": 3500,
  "rooms": 3,
  "bathrooms": 2,
  "propertyType": "house",
  "amenities": ["WiFi", "AC", "Kitchen"],
  "images": ["url1", "url2"]
}

Response:
{
  "success": true,
  "message": "Property created successfully",
  "data": {...}
}
```

---

## Troubleshooting

### Common Issues

#### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017

Solution:
1. Ensure MongoDB is running
2. Check MONGODB_URI in .env
3. Verify credentials if using Atlas
4. Check whitelist IP if using Atlas
```

#### SSL Certificate Error
```
Error: ENOENT: no such file or directory, open '/path/to/cert.pem'

Solution:
1. Verify SSL_KEY_PATH and SSL_CERT_PATH in .env
2. Check file permissions: chmod 644 *.pem
3. Try HTTP first: set USE_HTTPS=false
4. Renew certificates if expired
```

#### Face Recognition Not Working
```
Error: No face detected in image

Solution:
1. Ensure adequate lighting
2. Face should be 20-40% of image
3. Face should be frontal (< 15° angle)
4. Image quality should be > 70
5. Check FACE_MATCHING_THRESHOLD is appropriate (0.6 recommended)
```

#### JWT Token Errors
```
Error: Invalid or expired token

Solution:
1. Verify JWT_SECRET and REFRESH_TOKEN_SECRET set
2. Check token expiration: JWT_EXPIRE and REFRESH_TOKEN_EXPIRE
3. Use /api/v1/auth/refresh-token to get new token
4. Regenerate secrets if compromised
```

#### Rate Limiting Issues
```
Error: Too many requests from this IP

Solution:
1. Increase RATE_LIMIT_MAX_REQUESTS if needed
2. Increase RATE_LIMIT_WINDOW_MS (time window)
3. Use different IP or wait for window to reset
4. Implement IP whitelisting for specific services
```

### Performance Tips

1. **Database Indexing**: Ensure indexes on frequently queried fields
   ```javascript
   userSchema.index({ email: 1 });
   propertySchema.index({ city: 1, isAvailable: 1 });
   ```

2. **Caching**: Implement Redis for frequently accessed data
   ```bash
   npm install redis ioredis
   ```

3. **Pagination**: Always use limit and page for large datasets
   ```
   GET /api/v1/properties?limit=10&page=1
   ```

4. **Image Optimization**: Compress uploaded images
   ```bash
   npm install sharp
   ```

5. **Connection Pooling**: MongoDB connection pooling is automatic with Mongoose

---

## Health Check

```bash
# Health endpoint
curl http://localhost:5003/health

# Expected response
{
  "status": "OK",
  "timestamp": "2024-03-15T10:30:00Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

## Next Steps

1. ✅ Configure MongoDB connection
2. ✅ Set up environment variables
3. ✅ Install and configure face recognition library
4. ✅ Generate SSL certificates
5. ✅ Deploy with Docker or Node.js directly
6. ✅ Set up monitoring and logging
7. ✅ Configure rate limiting and CORS
8. ✅ Test all biometric flows
9. ✅ Monitor performance and errors
10. ✅ Regular security audits and updates

---

## Support & Resources

- [Express.js Documentation](http://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT Introduction](https://jwt.io/)
- [face-api.js GitHub](https://github.com/vladmandic/face-api)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Last Updated**: March 2024  
**Version**: 2.0.0 (Production Ready)
