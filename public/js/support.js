'use strict';
window.FPH = window.FPH || {};

window.FPH.support = (() => {
  const { api } = FPH;

  async function getAll(params={})       { return api.get('/support',{params}); }
  async function getById(id)             { return api.get(`/support/${id}`); }
  async function create(subject,message,category='general') {
    return api.post('/support',{subject,message,category});
  }
  async function reply(id,message)       { return api.post(`/support/${id}/reply`,{message}); }
  async function close(id)              { return api.patch(`/support/${id}/close`,{}); }

  // FAQ data (static — no API call needed)
  const FAQ = [
    {q:'How do I verify my Ghana Card?', a:'Go to Settings → Account Verification and enter your Ghana Card number and full name. An admin will review within 24–48 hours.'},
    {q:'Can I use the app without verification?', a:'You can browse properties without verification, but you need to be verified to request a tenancy or send an inquiry.'},
    {q:'What payment methods are accepted?', a:'Mobile Money (MTN, Vodafone, AirtelTigo), bank transfer, and cash — all recorded through the invoicing system.'},
    {q:'How do I report a maintenance issue?', a:'From your dashboard, go to Maintenance → New Request. Add a description, priority, and photos if available.'},
    {q:'How does face login work?', a:'We use face-api.js to capture a live face descriptor. It\'s matched against your enrolled face — no photo is stored, only a 128-number vector.'},
    {q:'What is demo mode?', a:'If our server is unreachable, the app falls back to demo mode — all data is stored in your browser and nothing is sent to a server.'},
  ];

  const CATEGORIES = ['general','payment','verification','property','technical'];

  return { getAll, getById, create, reply, close, FAQ, CATEGORIES };
})();