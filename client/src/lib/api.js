import { createBackupRequest, unwrapBackupEnvelope } from './backupProtocol.js';

const DEFAULT_BACKUP_URL =
  'https://script.google.com/macros/s/AKfycbxltvehv2uEB4SJBMJQ72AvB2qPjcsVqYyOV5-ddHDVRM1Th5DOree10VLS1fRMBOOZrQ/exec';

export const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
export const backupServerUrl = (
  import.meta.env.VITE_BACKUP_SERVER_URL === undefined
    ? DEFAULT_BACKUP_URL
    : import.meta.env.VITE_BACKUP_SERVER_URL
).replace(/\/$/, '');

const requestTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 4000;
const backupRequestTimeout = Number(import.meta.env.VITE_BACKUP_API_TIMEOUT_MS) || 15000;
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

async function fetchFromPrimary(baseUrl, path, options) {
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
    announceServer('primary');
    return body;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchFromBackup(path, options) {
  const request = createBackupRequest(backupServerUrl, path, options);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), backupRequestTimeout);

  try {
    const response = await fetch(request.url, {
      ...request.options,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('백업 API가 JSON이 아닌 응답을 보냈습니다. Apps Script 배포 권한을 확인해 주세요.');
    }

    const envelope = await response.json();
    if (!response.ok) {
      throw new Error(envelope?.error || `백업 요청을 처리하지 못했습니다. (${response.status})`);
    }

    const body = unwrapBackupEnvelope(envelope);
    announceServer('backup');
    return body;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function apiRequest(path, options = {}) {
  if (!serverUrl) {
    if (!backupServerUrl) throw new Error('사용할 수 있는 서버 주소가 설정되지 않았습니다.');
    return fetchFromBackup(path, options);
  }

  try {
    return await fetchFromPrimary(serverUrl, path, options);
  } catch (primaryError) {
    if (!backupServerUrl || primaryError.canFailOver === false) throw primaryError;

    try {
      return await fetchFromBackup(path, options);
    } catch (backupError) {
      if (backupError.status >= 400 && backupError.status < 500) throw backupError;
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
