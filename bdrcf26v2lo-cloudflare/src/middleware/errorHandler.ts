import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/api.error';
import { InvalidStateTransitionError } from '../domain/lockoutStateMachine';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Handle custom InvalidStateTransitionError
  if (err instanceof InvalidStateTransitionError) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: err.message,
        currentState: err.currentState,
        requiredState: err.requiredState,
      },
    });
    return;
  }

  // 2. Handle structured API Errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 3. Log unexpected internal server errors
  console.error('Unhandled server error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server',
    },
  });
}
