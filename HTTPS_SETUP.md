# HTTPS Setup Guide

Your backend is configured to support HTTPS, but requires valid SSL certificates. This guide shows you how to generate them.

## Current Status

Your `.env` file has:
```
USE_HTTPS=false          # Currently disabled for development
SSL_KEY_PATH=./ssl/private-key.pem
SSL_CERT_PATH=./ssl/certificate.pem
```

## Option 1: Use Git for Windows (Recommended for Windows Users)

Git for Windows includes OpenSSL, which makes certificate generation straightforward.

### Steps:

1. **Install Git for Windows** (if not already installed)
   - Download: https://git-scm.com/download/win
   - During installation, ensure "Use Git from the Windows Command Prompt" or "Use Git and optional Unix tools" is selected
   - This includes OpenSSL in the Git Bash environment

2. **Generate certificates via Git Bash:**
   ```bash
   # Open Git Bash (right-click folder → Git Bash Here)
   cd ssl
   openssl req -x509 -newkey rsa:2048 -nodes \
     -keyout private-key.pem \
     -out certificate.pem \
     -days 365 \
     -subj "/CN=localhost/O=Future Property Holdings/C=US"
   ```

3. **Update .env to enable HTTPS:**
   ```
   USE_HTTPS=true
   ```

4. **Restart your server:**
   ```bash
   npm run dev
   ```

---

## Option 2: Use Windows Subsystem for Linux (WSL2)

If you have WSL2 installed with Ubuntu or similar:

1. **Open PowerShell as Administrator:**
   ```powershell
   wsl bash
   ```

2. **Navigate to your project and generate certificates:**
   ```bash
   cd /mnt/c/Users/OWNER/Desktop/FUTURE/ssl
   openssl req -x509 -newkey rsa:2048 -nodes \
     -keyout private-key.pem \
     -out certificate.pem \
     -days 365 \
     -subj "/CN=localhost"
   ```

3. **Enable HTTPS and restart:**
   - Update `.env` to set `USE_HTTPS=true`
   - Run `npm run dev`

---

## Option 3: Use Docker (All Platforms)

If you have Docker installed:

1. **Generate certificates in Docker:**
   ```powershell
   docker run --rm -v "${PWD}/ssl:/cert" alpine:latest \
     openssl req -x509 -newkey rsa:2048 -nodes \
     -keyout /cert/private-key.pem \
     -out /cert/certificate.pem \
     -days 365 \
     -subj "/CN=localhost"
   ```

2. **Enable HTTPS in .env and restart**

---

## Option 4: Online Certificate Generator (Development Only)

For quick testing, you can use online tools (NOT recommended for production):

1. Visit: https://www.selfsignedcertificate.com/
2. Set:
   - Domain: `localhost`
   - Validity: 365+ days
   - Key Size: 2048
3. Copy the certificate to `ssl/certificate.pem`
4. Copy the private key to `ssl/private-key.pem`
5. Set `USE_HTTPS=true` in `.env`

---

## Production Certificates (Let's Encrypt)

For production with a real domain:

### Using Certbot (Recommended):

```bash
# Install Certbot
npm install -g certbot

# Generate certificate for your domain
certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com

# Update .env:
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
USE_HTTPS=true

# Auto-renewal (runs daily):
certbot renew --quiet --no-eff-email
```

### Using Docker for Let's Encrypt:

See [PRODUCTION_SETUP.md](../PRODUCTION_SETUP.md) for detailed Docker + Let's Encrypt instructions.

---

## Verifying HTTPS is Working

Once certificates are in place:

1. **Start your server:**
   ```bash
   npm run dev
   ```

2. **You should see:**
   ```
   ✓ HTTPS Server running on https://localhost:5003
   ```

3. **Test the endpoint:**
   ```bash
   curl -k https://localhost:5003/health
   ```
   The `-k` flag ignores certificate validation (needed for self-signed certs)

---

## Browser Warning for Self-Signed Certificates

When using self-signed certificates, browsers will show a security warning:
- This is **normal and expected** for development
- Click "Advanced" → "Proceed to localhost" to continue
- The connection is still encrypted

---

## Troubleshooting

**Error: "SSL certificate sign verify failure"**
- Ensure both `private-key.pem` and `certificate.pem` exist in the `ssl/` folder
- Verify filenames match your `.env` settings exactly
- Check file permissions allow Node.js to read them

**Error: "bad base64 decode"**
- Certificate file is corrupted or incomplete
- Regenerate using one of the methods above
- Ensure you copied the entire PEM content (BEGIN to END)

**Server still running on HTTP**
- Check `.env` has `USE_HTTPS=true`
- Restart the server after changing `.env`
- Check the terminal output for specific errors

---

## Next Steps

1. **Choose an option** from above (Git + OpenSSL recommended for Windows)
2. **Generate certificates** using that method
3. **Update .env:** Set `USE_HTTPS=true`
4. **Restart server:** Run `npm run dev`
5. **Test:** Visit `https://localhost:5003/health`

Your backend API architecture is production-ready for HTTPS! 🔐

