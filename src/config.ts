import dotenv from 'dotenv';

dotenv.config();

export const config = {
  api: {
    baseUrl: 'https://client-api.8slp.net/v1',
    authUrl: 'https://auth-api.8slp.net/v1/tokens',
  },
  auth: {
    email: process.env.EIGHT_SLEEP_EMAIL || '',
    password: process.env.EIGHT_SLEEP_PASSWORD || '',
    clientId: process.env.EIGHT_SLEEP_CLIENT_ID || '0894c7f33bb94800a03f1f4df13a4f38',
    clientSecret: process.env.EIGHT_SLEEP_CLIENT_SECRET || 'f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76',
    userId: process.env.EIGHT_SLEEP_USER_ID || ''
  },
  server: {
    port: process.env.PORT || 8001,
  },
}; 