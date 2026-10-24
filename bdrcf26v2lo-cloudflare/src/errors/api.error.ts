export abstract class ApiError extends Error {
  public abstract statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, errorCode: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.errorCode = errorCode;
    this.details = details;
  }
}

export class UnauthenticatedError extends ApiError {
  public statusCode = 401;
  constructor(message = 'Authentication required', errorCode = 'UNAUTHENTICATED') {
    super(message, errorCode);
  }
}

export class UnauthorizedError extends ApiError {
  public statusCode = 403;
  constructor(message = 'Access denied', errorCode = 'UNAUTHORIZED') {
    super(message, errorCode);
  }
}

export class NotFoundError extends ApiError {
  public statusCode = 404;
  constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    super(message, errorCode);
  }
}

export class ValidationError extends ApiError {
  public statusCode = 400;
  constructor(message = 'Validation failed', details?: any) {
    super(message, 'VALIDATION_FAILED', details);
  }
}

export class ConflictError extends ApiError {
  public statusCode = 409;
  constructor(message: string, errorCode = 'CONFLICT', details?: any) {
    super(message, errorCode, details);
  }
}
