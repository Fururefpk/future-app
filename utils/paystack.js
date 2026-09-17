'use strict';

const PAYSTACK_API = 'https://api.paystack.co';

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || key.includes('your_') || key.includes('xxxxxxxx')) {
    throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY.');
  }
  return key;
}

async function paystackRequest(path, options = {}) {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === false) {
    throw new Error(body.message || `Paystack request failed (${response.status})`);
  }
  return body.data;
}

function initializeTransaction({ email, amount, reference, callbackUrl }) {
  return paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: Math.round(Number(amount) * 100),
      currency: 'GHS',
      reference,
      callback_url: callbackUrl || undefined,
    }),
  });
}

function verifyTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

module.exports = { initializeTransaction, verifyTransaction };
