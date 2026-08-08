export const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const { teacherPin, ...fetchOptions } = options;
  const response = await fetch(`${serverUrl}${path}`, {
    ...fetchOptions,
    headers: {
      'content-type': 'application/json',
      ...(teacherPin ? { 'x-teacher-pin': teacherPin } : {}),
      ...fetchOptions.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    throw new Error(body?.error || `요청을 처리하지 못했습니다. (${response.status})`);
  }
  return body;
}

export function queryValue(name, fallback = '') {
  const hashQuery = window.location.hash.split('?')[1] || '';
  const hashValue = new URLSearchParams(hashQuery).get(name);
  const regularValue = new URLSearchParams(window.location.search).get(name);
  return hashValue || regularValue || fallback;
}
