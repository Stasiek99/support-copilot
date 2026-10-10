import type { ApiError } from '@support-copilot/shared';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

type ErrorCode = ApiError['error']['code'];
type ErrorDetails = NonNullable<ApiError['error']['details']>;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function sendError(
  res: Response,
  requestId: string | undefined,
  status: number,
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): void {
  const body: ApiError = { error: { code, message, requestId, details } };
  res.status(status).json(body);
}

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, String(req.id), 404, 'not_found', 'Resource not found');
};

function isClientParserError(error: unknown): error is { status: number; expose: boolean } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const requestId = String(req.id);

  if (error instanceof HttpError) {
    sendError(res, requestId, error.status, error.code, error.message, error.details);
    return;
  }
  if (isClientParserError(error)) {
    const message = error.status === 413 ? 'Request body is too large' : 'Malformed request body';
    sendError(res, requestId, error.status, 'invalid_request', message);
    return;
  }

  req.log.error({ err: error }, 'unhandled error');
  sendError(res, requestId, 500, 'internal_error', 'Something went wrong');
};
