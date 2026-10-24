import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/api.error';
import { Role } from '../domain/types';

export function authorize(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Identity not established'));
    }

    const userRole = req.user.role;
    const hasRole = allowedRoles.includes(userRole);

    if (!hasRole) {
      return next(
        new UnauthorizedError(
          `Role '${userRole}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}
