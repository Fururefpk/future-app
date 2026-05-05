// Vercel serverless entry — exports the Express app
process.env.SERVERLESS = '1';
const app = require('../server');
module.exports = app;
