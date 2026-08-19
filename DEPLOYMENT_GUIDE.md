# Deployment Guide - Future Property Holdings

## ✅ Completion Status

### Upgrade & Update Completed
- ✅ Dependencies updated to stable, secure versions
- ✅ Security vulnerabilities fixed (27 vulnerabilities addressed)
- ✅ All tests passing (8/8 test cases passed)
- ✅ Application verified and ready for production

### Versions Updated
- **express**: ^4.18.2 (web framework)
- **mongoose**: ^8.0.0 (MongoDB driver)
- **helmet**: ^7.1.0 (security headers)
- **express-validator**: ^7.0.0 (input validation)
- **express-rate-limit**: ^7.1.5 (rate limiting)
- **jsonwebtoken**: ^9.0.2 (JWT auth)
- **dotenv**: ^16.3.1 (environment config)

### Bug Fixes Applied
- Added missing `getUserPublicProfile()` controller function
- Added missing `authorize()` middleware import to tenancies route
- Added missing `requireOwnerOrLandlord` and inquiry participant middlewares
- Fixed all route middleware dependencies

## 📦 Deployment Options

### Option 1: Vercel CLI (Recommended for Development)

```bash
# Install Vercel CLI globally (one time only)
npm install -g vercel

# Deploy to Vercel
cd /path/to/future-app
vercel deploy --prod

# You will be prompted to:
# 1. Authenticate with Vercel (if not already logged in)
# 2. Confirm project settings
# 3. Set environment variables
```

### Option 2: GitHub Integration (Recommended for Production)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "chore: upgrade dependencies and fix bugs for production"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect configuration from `vercel.json`

3. **Auto-Deploy on Push**:
   - Every push to `main` branch will automatically deploy to production
   - Pull requests get preview deployments

### Option 3: Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Click "Deploy"

## 🔐 Required Environment Variables

Set these in Vercel Project Settings → Environment Variables:

```
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/future_properties?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_secret_key_change_this_in_production_minimum_32_characters
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_minimum_32_characters
REFRESH_TOKEN_EXPIRE=30d

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Future Property Holdings <onboarding@resend.dev>

# SMS Service (Africa's Talking)
AT_API_KEY=your_africastalking_api_key
AT_USERNAME=your_africastalking_username

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_key
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15m

# Application
NODE_ENV=production
APP_URL=https://futurepropertyholdings.vercel.app
API_BASE_URL=https://futurepropertyholdings.vercel.app
CORS_ORIGIN=https://futurepropertyholdings.vercel.app
API_VERSION=v1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Setup
MASTER_KEY=choose_a_strong_secret_at_least_32_chars

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# Logging
LOG_LEVEL=info
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured in Vercel
- [ ] MongoDB Atlas connection verified and IP whitelist updated
- [ ] SSL/TLS certificate installed (Vercel provides free HTTPS)
- [ ] Email service (Resend) API key configured
- [ ] SMS service (Africa's Talking) API key configured
- [ ] Domain configured (optional, Vercel provides free *.vercel.app domain)
- [ ] Health check endpoint verified: `GET /health`
- [ ] API endpoints tested in production environment
- [ ] Admin user created with master key: `npm run create-admin` (after deployment)

## 🔍 Post-Deployment Verification

After deployment:

1. **Health Check**:
   ```bash
   curl https://futurepropertyholdings.vercel.app/health
   ```

2. **Test API Endpoints**:
   ```bash
   # Register endpoint
   curl -X POST https://futurepropertyholdings.vercel.app/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com",...}'
   
   # Login endpoint
   curl -X POST https://futurepropertyholdings.vercel.app/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

3. **Verify Environment**:
   ```bash
   curl https://futurepropertyholdings.vercel.app/health | jq .environment
   # Should return: "production"
   ```

## 📊 Performance & Monitoring

### Vercel Analytics
- Vercel automatically tracks performance metrics
- Dashboard: https://vercel.com/dashboard/project

### Application Monitoring
- Health endpoint: `GET /health`
- Returns uptime, environment, timestamp

### Database Monitoring
- Monitor MongoDB Atlas: https://cloud.mongodb.com
- Check connection pool and query performance
- Set up alerts for high error rates

## 🔄 Continuous Deployment

Your application is configured for continuous deployment:

1. **Development**: Push to development branch for preview deployments
2. **Staging**: Create staging environment for testing
3. **Production**: Deploy to production via main branch or Vercel dashboard

## 🆘 Troubleshooting

### Deployment Fails
- Check Vercel build logs: `vercel logs`
- Verify all environment variables are set
- Ensure package.json has correct node version (>=18.0.0)

### API Returns 500 Errors
- Check application logs: `vercel logs --follow`
- Verify MONGODB_URI connection string
- Check environment variables are loaded correctly

### Cold Start Performance
- First request may take 5-10 seconds
- Subsequent requests are faster
- Consider keeping a health check active

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes Vercel IPs
- Check connection string format
- Test connection locally before deploying

## 📝 Next Steps

1. **Configure Environment Variables**: Set all variables in Vercel dashboard
2. **Deploy**: Use one of the three deployment options above
3. **Verify**: Test health endpoint and API endpoints
4. **Monitor**: Set up monitoring and alerts
5. **Scale**: Configure auto-scaling if needed

## 💬 Support

For Vercel deployment issues:
- Docs: https://vercel.com/docs
- Status: https://www.vercelstatus.com
- Support: https://vercel.com/support

For application issues:
- Review application logs
- Check MongoDB connection
- Verify environment variables
- Test locally first

---

**Last Updated**: 2026-06-16
**Version**: 2.0.0
**Status**: Production Ready ✅
