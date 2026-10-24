import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { D1UsersRepository } from '../repositories/d1/users.repository';
import { UnauthenticatedError } from '../errors/api.error';
import { User, Role } from '../domain/types';
import { requestContext } from '../context/requestContext';

const usersRepository = new D1UsersRepository();
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
declare global {
  namespace Express { interface Request { user?: User; env?: any; } }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.headers['cf-access-jwt-assertion'] || req.headers.authorization?.replace(/^Bearer /, '');
  if (typeof token !== 'string' || !token) return next(new UnauthenticatedError('Cloudflare Access login required'));
  const bindings = req.env || requestContext.getStore()?.env || process.env;
  try {
    const issuer = String(bindings.CF_ACCESS_TEAM_DOMAIN || '').replace(/\/$/, '');
    const audience = bindings.CF_ACCESS_AUD;
    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience) throw new Error('Access configuration missing');
    let keys = keySets.get(issuer);
    if (!keys) { keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)); keySets.set(issuer, keys); }
    const { payload } = await jwtVerify(token, keys, { issuer, audience, algorithms: ['RS256'], requiredClaims: ['sub', 'email', 'exp', 'iat'] });
    if (typeof payload.email !== 'string' || typeof payload.sub !== 'string' || !payload.sub.trim()) throw new Error('Identity missing');
    const email = payload.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email claim');
    let user = await usersRepository.getUserByEmail(email);
    if (!user) {
      const admins = String(bindings.BOOTSTRAP_ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim());
      const role = admins.includes(email) ? Role.ADMIN : Role.REPORTER;
      user = { id: crypto.randomUUID(), uid: `access:${payload.sub}`, name: email.split('@')[0], email, role, roles: [role], isApproved: role === Role.ADMIN };
      await usersRepository.saveUser(user);
    }
    if (user.uid?.startsWith('access:') && user.uid !== `access:${payload.sub}`) throw new Error('Identity changed');
    if (user.isApproved === false) throw new Error('Account is not approved');
    req.user = user;
    next();
  } catch {
    next(new UnauthenticatedError('Invalid or expired Cloudflare Access session'));
  }
}
