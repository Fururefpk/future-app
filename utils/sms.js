const sendSMS = async (to, message) => {
    if (!process.env.AT_API_KEY || process.env.AT_API_KEY.includes('your_')) {
        console.warn('SMS skipped: Africa\'s Talking is not configured');
        return null;
    }

    const username = process.env.AT_USERNAME || 'sandbox';
    const apiHost = username === 'sandbox'
        ? 'https://api.sandbox.africastalking.com'
        : 'https://api.africastalking.com';
    const body = new URLSearchParams({
        username,
        to: Array.isArray(to) ? to.join(',') : to,
        message,
    });

    try {
        const response = await fetch(`${apiHost}/version1/messaging`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                apiKey: process.env.AT_API_KEY,
            },
            body,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || `SMS request failed (${response.status})`);
        return result;
    } catch (error) {
        console.error('SMS send error:', error.message);
        return null;
    }
};

module.exports = sendSMS;