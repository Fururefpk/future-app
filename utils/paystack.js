'use strict';

const https = require('https');
const crypto = require('crypto');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getPaystackConfig() {
  return {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  };
}

function requestPaystack(method, path, body) {
  const { secretKey } = getPaystackConfig();
  if (!secretKey) {
    const error = new Error('PAYSTACK_SECRET_KEY is not configured');
    error.statusCode = 500;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const url = new URL(`${PAYSTACK_BASE_URL}${path}`);
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode >= 400) {
              const error = new Error(parsed.message || 'Paystack request failed');
              error.statusCode = res.statusCode;
              error.response = parsed;
              return reject(error);
            }
            resolve(parsed);
          } catch (err) {
            reject(err);
          }
        });
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function initializeTransaction({ email, amount, reference, invoiceId, callbackUrl }) {
  return requestPaystack('POST', '/transaction/initialize', {
    email,
    amount,
    reference,
    callback_url: callbackUrl,
    metadata: {
      invoiceId,
    },
  });
}

async function verifyTransaction(reference) {
  return requestPaystack('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
}

function isValidWebhookSignature(payload, signature) {
  const { webhookSecret } = getPaystackConfig();
  if (!webhookSecret) return true;
  const expected = crypto.createHmac('sha512', webhookSecret).update(payload, 'utf8').digest('hex');
  return expected === signature;
}

module.exports = {
  getPaystackConfig,
  initializeTransaction,
  verifyTransaction,
  isValidWebhookSignature,
};
