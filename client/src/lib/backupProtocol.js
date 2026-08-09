function splitApiPath(path) {
  const url = new URL(path, 'https://gyosil-easy.invalid');
  return {
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
  };
}

function parseBody(body) {
  if (body === undefined) return null;
  if (typeof body !== 'string') return body;

  try {
    return JSON.parse(body);
  } catch {
    throw new Error('백업 서버로 보낼 JSON 요청 본문이 올바르지 않습니다.');
  }
}

export function createBackupRequest(baseUrl, path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const { pathname, query } = splitApiPath(path);

  if (method === 'GET' && options.body === undefined) {
    const url = new URL(baseUrl);
    url.searchParams.set('path', pathname);
    url.searchParams.set('method', method);
    Object.entries(query).forEach(([name, value]) => url.searchParams.set(name, value));
    return {
      url: url.toString(),
      options: { method: 'GET' },
    };
  }

  return {
    url: baseUrl,
    options: {
      method: 'POST',
      // text/plain is a CORS-safelisted content type. Apps Script does not handle
      // the browser's OPTIONS preflight for application/json or custom headers.
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        path: pathname,
        method,
        query,
        body: parseBody(options.body),
        teacherPin: options.teacherPin || '',
      }),
    },
  };
}

export function unwrapBackupEnvelope(envelope) {
  if (!envelope || typeof envelope.ok !== 'boolean' || !Number.isInteger(envelope.status)) {
    const error = new Error(
      '백업 API 응답 형식이 올바르지 않습니다. Apps Script를 최신 코드로 다시 배포해 주세요.',
    );
    error.status = 502;
    throw error;
  }

  if (!envelope.ok) {
    const error = new Error(envelope.error || `백업 요청을 처리하지 못했습니다. (${envelope.status})`);
    error.status = envelope.status;
    throw error;
  }

  return envelope.data;
}
