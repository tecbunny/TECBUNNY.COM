type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const envLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const activeMin = levelOrder[envLevel] ?? 20;

export interface LogMeta { [k: string]: unknown }

function serialize(level: LogLevel, msg: string, meta?: LogMeta) {
  const base: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    msg,
  };
  if (meta && Object.keys(meta).length) base.meta = redacted(meta);
  return JSON.stringify(base);
}

// Basic redaction for likely sensitive keys
const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'auth', 'email'];
function redacted(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redacted);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'object') {
      out[k] = redacted(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const noop = () => {};

const baseConsole = typeof globalThis !== 'undefined' && globalThis.console ? globalThis.console : null;

const writers: Record<LogLevel, (line: string) => void> = {
  debug: baseConsole?.debug?.bind(baseConsole) ?? baseConsole?.log?.bind(baseConsole) ?? noop,
  info: baseConsole?.info?.bind(baseConsole) ?? baseConsole?.log?.bind(baseConsole) ?? noop,
  warn: baseConsole?.warn?.bind(baseConsole) ?? baseConsole?.log?.bind(baseConsole) ?? noop,
  error: baseConsole?.error?.bind(baseConsole) ?? baseConsole?.log?.bind(baseConsole) ?? noop,
};

function log(level: LogLevel, msg: string, meta?: LogMeta) {
  if (levelOrder[level] < activeMin) return;
  const line = serialize(level, msg, meta);
  writers[level](line);
}

export const logger = {
  debug: (m: string, meta?: LogMeta) => log('debug', m, meta),
  info: (m: string, meta?: LogMeta) => log('info', m, meta),
  warn: (m: string, meta?: LogMeta) => log('warn', m, meta),
  error: (m: string, meta?: LogMeta) => log('error', m, meta),
};

export type { LogLevel };
