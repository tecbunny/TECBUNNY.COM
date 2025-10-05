import { NextResponse } from 'next/server';

export interface ApiErrorDef {
  code: string;
  status: number;
  message: string;
}

// Central catalogue (extend as needed)
export const ERROR_DEFS: Record<string, Omit<ApiErrorDef, 'code'>> = {
  VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
  RATE_LIMITED: { status: 429, message: 'Rate limit exceeded' },
  UNAUTHORIZED: { status: 401, message: 'Unauthorized' },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  CONFLICT: { status: 409, message: 'Conflict' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'Service temporarily unavailable' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
};

interface ErrorOptions {
  details?: Record<string, unknown>;
  overrideMessage?: string;
  correlationId?: string | null;
}

export function apiError(code: keyof typeof ERROR_DEFS, opts: ErrorOptions = {}) {
  const def = ERROR_DEFS[code];
  if (!def) {
    throw new Error(`Unknown error code: ${code}`);
  }
  
  const body: Record<string, unknown> = {
    error: {
      code,
      message: opts.overrideMessage || def.message,
    },
  };
  if (opts.details) (body.error as Record<string, unknown>).details = opts.details;
  if (opts.correlationId) body.correlationId = opts.correlationId;
  return NextResponse.json(body, { status: def.status });
}

export function apiSuccess<T extends object>(data: T, correlationId?: string | null) {
  const body: Record<string, unknown> = { success: true, ...data };
  if (correlationId) body.correlationId = correlationId;
  return NextResponse.json(body);
}
