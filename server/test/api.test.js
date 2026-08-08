import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createGyosilServer } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createGyosilServer({
    databasePath: ':memory:',
    clientDistPath: 'Z:/does-not-exist',
    defaultRoom: 'classroom-1',
    historyLimit: 100,
    teacherPin: '2468',
    allowedOrigins: [],
    isProduction: false,
  });
  await new Promise((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
  const address = server.httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await server.close();
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  return { response, body: await response.json() };
}

test('health endpoint reports a working database', async () => {
  const { response, body } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
});

test('teacher messages require the configured PIN and persist responses', async () => {
  const messageInput = {
    room: 'classroom-1',
    type: 'question',
    target: '',
    message: '교실 지금 덥니?',
    responseOptions: ['네, 더워요 🥵', '괜찮아요 🙂'],
    allowText: true,
  };

  const denied = await request('/api/messages', {
    method: 'POST',
    body: JSON.stringify(messageInput),
  });
  assert.equal(denied.response.status, 401);

  const created = await request('/api/messages', {
    method: 'POST',
    headers: { 'x-teacher-pin': '2468' },
    body: JSON.stringify(messageInput),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.status, 'active');

  const answered = await request(`/api/messages/${created.body.id}/responses`, {
    method: 'POST',
    body: JSON.stringify({
      kind: 'preset',
      value: '네, 더워요 🥵',
      respondent: '3학년 1반',
    }),
  });
  assert.equal(answered.response.status, 201);
  assert.equal(answered.body.message.responses.length, 1);

  const state = await request('/api/state?room=classroom-1');
  assert.equal(state.response.status, 200);
  assert.equal(state.body.active.length, 1);
  assert.equal(state.body.active[0].responses[0].value, '네, 더워요 🥵');

  const closed = await request(`/api/messages/${created.body.id}/close`, {
    method: 'POST',
    headers: { 'x-teacher-pin': '2468' },
  });
  assert.equal(closed.response.status, 200);
  assert.equal(closed.body.status, 'closed');

  const lateResponse = await request(`/api/messages/${created.body.id}/responses`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'text', value: '늦은 답변' }),
  });
  assert.equal(lateResponse.response.status, 409);
});

test('server rejects unknown response buttons', async () => {
  const created = await request('/api/messages', {
    method: 'POST',
    headers: { 'x-teacher-pin': '2468' },
    body: JSON.stringify({
      room: 'classroom-1',
      type: 'call',
      target: '김민수',
      message: '김민수, 교무실로 오렴.',
      responseOptions: ['지금 갈게요 🙋'],
      allowText: false,
    }),
  });

  const invalid = await request(`/api/messages/${created.body.id}/responses`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'preset', value: '임의 응답' }),
  });
  assert.equal(invalid.response.status, 400);
});

test('call messages require a student name', async () => {
  const invalid = await request('/api/messages', {
    method: 'POST',
    headers: { 'x-teacher-pin': '2468' },
    body: JSON.stringify({
      room: 'classroom-1',
      type: 'call',
      target: '',
      message: '교무실로 오렴.',
      responseOptions: ['지금 갈게요 🙋'],
      allowText: true,
    }),
  });
  assert.equal(invalid.response.status, 400);
});
