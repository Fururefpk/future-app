'use strict';
const ok = (res, data) => res.status(200).json({ success: true, data });

/**
 * Lightweight analytics event receiver.
 * Logs events to the console in development; in production you'd
 * forward to a proper analytics service (Mixpanel, PostHog, etc.).
 */
exports.trackEvents = async (req, res) => {
  const { events = [] } = req.body;
  if (process.env.NODE_ENV !== 'production') {
    events.forEach(e => console.log('[analytics]', e.event, e.data));
  }
  ok(res, { received: events.length });
};

exports.getPageViews = async (req, res) => {
  // Stub — wire to your analytics provider
  ok(res, { views: 0, message: 'Connect an analytics provider for real data' });
};