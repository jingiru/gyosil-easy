import assert from 'node:assert/strict';
import test from 'node:test';
import { createBackupRequest, unwrapBackupEnvelope } from '../src/lib/backupProtocol.js';

const backupUrl = 'https://script.google.com/macros/s/deployment-id/exec';

test('GET 요청을 Apps Script 쿼리 규격으로 변환한다', () => {
  const request = createBackupRequest(backupUrl, '/api/state?room=classroom-1');
  const url = new URL(request.url);

  assert.equal(url.origin + url.pathname, backupUrl);
  assert.equal(url.searchParams.get('path'), '/api/state');
  assert.equal(url.searchParams.get('method'), 'GET');
  assert.equal(url.searchParams.get('room'), 'classroom-1');
  assert.deepEqual(request.options, { method: 'GET' });
});

test('쓰기 요청은 preflight 없는 text/plain 봉투로 변환한다', () => {
  const request = createBackupRequest(backupUrl, '/api/messages', {
    method: 'POST',
    teacherPin: '1234',
    body: JSON.stringify({ room: 'classroom-1', message: '테스트' }),
  });

  assert.equal(request.url, backupUrl);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['content-type'], 'text/plain;charset=UTF-8');
  assert.deepEqual(JSON.parse(request.options.body), {
    path: '/api/messages',
    method: 'POST',
    query: {},
    body: { room: 'classroom-1', message: '테스트' },
    teacherPin: '1234',
  });
});

test('Apps Script 성공 봉투에서 기존 API 응답을 꺼낸다', () => {
  assert.deepEqual(
    unwrapBackupEnvelope({ ok: true, status: 200, data: { defaultRoom: 'classroom-1' } }),
    { defaultRoom: 'classroom-1' },
  );
});

test('Apps Script 논리 오류 상태를 일반 오류로 바꾼다', () => {
  assert.throws(
    () => unwrapBackupEnvelope({ ok: false, status: 401, error: 'PIN 오류' }),
    (error) => error.message === 'PIN 오류' && error.status === 401,
  );
});
