import { getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from './errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) return next(new ApiError(401, 'Unauthorized'));
  next();
}
