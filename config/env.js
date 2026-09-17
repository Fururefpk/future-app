'use strict';

const REQUIRED_ENV_KEYS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
];

const RECOMMENDED_ENV_KEYS = [
  'SESSION_SECRET',
  'MASTER_KEY',
  'CORS_ORIGIN',
  'ALLOWED_ORIGINS',
  'PORT',
];

function getRequiredEnvKeys() {
  return [...REQUIRED_ENV_KEYS];
}

function validateEnvironment(env = process.env, options = {}) {
  const { allowTestEnv = false } = options;
  const runtimeEnv = env.NODE_ENV || 'development';

  if (allowTestEnv && runtimeEnv === 'test') {
    return [];
  }

  const missing = getRequiredEnvKeys().filter((key) => {
    const value = env[key];
    return !value || !String(value).trim();
  });

  return missing;
}

module.exports = {
  REQUIRED_ENV_KEYS,
  RECOMMENDED_ENV_KEYS,
  getRequiredEnvKeys,
  validateEnvironment,
};
