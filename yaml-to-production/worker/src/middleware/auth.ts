import { Context, Next } from 'hono';
import * as jose from 'jose';
import { Env } from '../types/env';

export interface AuthUser {
  id: string;
  email?: string;
  wallet?: string;
  createdAt: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

const PRIVY_VERIFICATION_KEY_URL = 'https://auth.privy.io/api/v1/apps';

let cachedJwks: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_DURATION = 3600000; // 1 hour

async function getPrivyJwks(appId: string): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();

  if (cachedJwks && now - jwksCacheTime < JWKS_CACHE_DURATION) {
    return cachedJwks;
  }

  const jwksUrl = `${PRIVY_VERIFICATION_KEY_URL}/${appId}/jwks.json`;
  cachedJwks = jose.createRemoteJWKSet(new URL(jwksUrl));
  jwksCacheTime = now;

  return cachedJwks;
}

export async function verifyPrivyToken(token: string, env: Env): Promise<AuthUser | null> {
  try {
    const jwks = await getPrivyJwks(env.PRIVY_APP_ID);

    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: 'privy.io',
      audience: env.PRIVY_APP_ID,
    });

    // Extract user info from Privy token claims
    const userId = payload.sub as string;
    const linkedAccounts = (payload.linked_accounts as Array<{ type: string; address?: string; email?: string }>) || [];

    let email: string | undefined;
    let wallet: string | undefined;

    for (const account of linkedAccounts) {
      if (account.type === 'email' && account.email) {
        email = account.email;
      }
      if (account.type === 'wallet' && account.address) {
        wallet = account.address;
      }
    }

    return {
      id: userId,
      email,
      wallet,
      createdAt: new Date((payload.iat || 0) * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'Missing token' }, 401);
  }

  const user = await verifyPrivyToken(token, c.env);

  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }

  c.set('user', user);
  await next();
}

export function requireAuth(c: Context<{ Bindings: Env }>): AuthUser {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
