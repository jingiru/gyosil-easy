const DEFAULT_BACKUP_URL =
  'https://script.google.com/macros/s/AKfycbxltvehv2uEB4SJBMJQ72AvB2qPjcsVqYyOV5-ddHDVRM1Th5DOree10VLS1fRMBOOZrQ/exec';

export const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
export const backupServerUrl = (
  import.meta.env.VITE_BACKUP_SERVER_URL === undefined
    ? DEFAULT_BACKUP_URL
    : import.meta.env.VITE_BACKUP_SERVER_URL
).replace(/\/$/, '');

const requestTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 4000;
let activeServer = 'primary';
const serverListeners = new Set();

function announceServer(server) {
  if (activeServer === server) return;
  activeServer = server;
  serverListeners.forEach((listener) => listener(server));
}

export function getActiveServer() {
  return activeServer;
}

export function subscribeActiveServer(listener) {
  serverListeners.add(listener);
  return () => serverListeners.delete(listener);
}

function endpointUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

function canFailOver(response) {
  return response.status === 408 || response.status === 429 || response.status >= 500;
}

async function fetchFrom(baseUrl, path, options, server) {
  const { teacherPin, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeout);
  const hasBody = fetchOptions.body !== undefined;

  try {
    const response = await fetch(endpointUrl(baseUrl, path), {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...(teacherPin ? { 'x-teacher-pin': teacherPin } : {}),
        ...fetchOptions.headers,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(body?.error || `요청을 처리하지 못했습니다. (${response.status})`);
      error.canFailOver = canFailOver(response);
      throw error;
    }
    announceServer(server);
    return body;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function apiRequest(path, options = {}) {
  try {
    return await fetchFrom(serverUrl, path, options, 'primary');
  } catch (primaryError) {
    if (!backupServerUrl || primaryError.canFailOver === false) throw primaryError;

    try {
      return await fetchFrom(backupServerUrl, path, options, 'backup');
    } catch (backupError) {
      throw new Error(
        `방송실 서버와 백업 서버에 모두 연결할 수 없습니다. (${backupError.message})`,
      );
    }
  }
}

export function queryValue(name, fallback = '') {
  const hashQuery = window.location.hash.split('?')[1] || '';
  const hashValue = new URLSearchParams(hashQuery).get(name);
  const regularValue = new URLSearchParams(window.location.search).get(name);
  return hashValue || regularValue || fallback;
}
