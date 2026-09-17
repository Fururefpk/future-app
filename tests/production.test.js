const { validateEnvironment, getRequiredEnvKeys } = require('../config/env');

describe('production environment validation', () => {
  it('requires the critical production variables', () => {
    const missing = validateEnvironment({
      MONGODB_URI: '',
      JWT_SECRET: '',
      REFRESH_TOKEN_SECRET: '',
      NODE_ENV: 'production',
    });

    expect(missing).toEqual(expect.arrayContaining([
      'MONGODB_URI',
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET',
    ]));
  });

  it('allows the test environment to skip strict validation', () => {
    const missing = validateEnvironment({
      NODE_ENV: 'test',
    }, { allowTestEnv: true });

    expect(missing).toEqual([]);
  });

  it('exposes the required environment key list', () => {
    expect(getRequiredEnvKeys()).toEqual(expect.arrayContaining([
      'MONGODB_URI',
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET',
    ]));
  });
});
