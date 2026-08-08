import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(currentDir, '..');

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveFromServer(value, fallback) {
  const selected = value?.trim() || fallback;
  return path.isAbsolute(selected) ? selected : path.resolve(serverDir, selected);
}

export function readConfig(overrides = {}) {
  const allowedOrigins = (overrides.allowedOrigins ?? process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    host: overrides.host ?? process.env.HOST ?? '0.0.0.0',
    port: overrides.port ?? parsePositiveInteger(process.env.PORT, 3000),
    defaultRoom: overrides.defaultRoom ?? process.env.DEFAULT_ROOM ?? 'classroom-1',
    databasePath:
      overrides.databasePath ??
      resolveFromServer(process.env.DATABASE_PATH, './data/gyosil-easy.db'),
    clientDistPath:
      overrides.clientDistPath ??
      resolveFromServer(process.env.CLIENT_DIST_PATH, '../client/dist'),
    teacherPin: overrides.teacherPin ?? process.env.TEACHER_PIN ?? '',
    historyLimit:
      overrides.historyLimit ?? parsePositiveInteger(process.env.HISTORY_LIMIT, 100),
    allowedOrigins,
    isProduction: overrides.isProduction ?? process.env.NODE_ENV === 'production',
  };
}
