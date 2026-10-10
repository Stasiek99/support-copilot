import type { z } from 'zod';
import { HttpError } from './errors';

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  throw new HttpError(
    400,
    'invalid_request',
    'Request body is invalid',
    result.error.issues.slice(0, 10).map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  );
}
