import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { createDatabase } from './database.js';
import { defaultCallOptions, templates } from './templates.js';
import {
  ValidationError,
  validateMessageInput,
  validateResponseInput,
  validateRoom,
} from './validation.js';

function roomChannel(room) {
  return `room:${room}`;
}

function createCorsOrigin(config) {
  const developmentOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);
  const allowed = new Set(config.allowedOrigins);
  const allowEverywhere = allowed.has('*');

  return (origin, callback) => {
    if (!origin || allowEverywhere || allowed.has(origin)) {
      callback(null, true);
      return;
    }
    if (!config.isProduction && developmentOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('허용되지 않은 웹 페이지 주소입니다.'));
  };
}

export function createGyosilServer(config) {
  const database = createDatabase(config.databasePath);
  const app = express();
  const httpServer = http.createServer(app);
  const corsOrigin = createCorsOrigin(config);
  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  });

  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '32kb' }));

  function requireTeacherPin(req, res, next) {
    if (!config.teacherPin || req.get('x-teacher-pin') === config.teacherPin) {
      next();
      return;
    }
    res.status(401).json({ error: '교사 PIN이 올바르지 않습니다.' });
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: database.healthCheck(),
      service: 'gyosil-easy',
      serverTime: new Date().toISOString(),
    });
  });

  app.get('/api/config', (_req, res) => {
    res.json({
      defaultRoom: config.defaultRoom,
      teacherPinRequired: Boolean(config.teacherPin),
      templates,
      defaultCallOptions,
    });
  });

  app.get('/api/state', (req, res, next) => {
    try {
      const room = validateRoom(req.query.room, config.defaultRoom);
      res.json(database.getState(room, config.historyLimit));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/messages', requireTeacherPin, (req, res, next) => {
    try {
      const input = validateMessageInput(req.body, config.defaultRoom);
      const message = database.createMessage(input);
      io.to(roomChannel(message.room)).emit('message:new', message);
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/messages/:id/responses', (req, res, next) => {
    try {
      const input = validateResponseInput(req.body);
      const result = database.createResponse(req.params.id, input);
      if (result.error === 'not_found') {
        res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
        return;
      }
      if (result.error === 'closed') {
        res.status(409).json({ error: '이미 종료된 메시지입니다.' });
        return;
      }
      if (result.error === 'invalid_option') {
        res.status(400).json({ error: '등록되지 않은 응답 버튼입니다.' });
        return;
      }
      if (result.error === 'text_not_allowed') {
        res.status(400).json({ error: '이 메시지는 직접 답변을 받지 않습니다.' });
        return;
      }

      io.to(roomChannel(result.message.room)).emit('response:new', {
        messageId: result.message.id,
        response: result.response,
        message: result.message,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/messages/:id/close', requireTeacherPin, (req, res) => {
    const message = database.closeMessage(req.params.id);
    if (!message) {
      res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
      return;
    }
    io.to(roomChannel(message.room)).emit('message:closed', message);
    res.json(message);
  });

  if (fs.existsSync(path.join(config.clientDistPath, 'index.html'))) {
    app.use(express.static(config.clientDistPath));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(config.clientDistPath, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: '요청한 주소를 찾을 수 없습니다.' });
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: '서버에서 요청을 처리하지 못했습니다.' });
  });

  io.on('connection', (socket) => {
    try {
      const room = validateRoom(socket.handshake.auth?.room, config.defaultRoom);
      socket.join(roomChannel(room));
      socket.data.room = room;
      socket.emit('server:ready', {
        room,
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      socket.emit('server:error', { message: error.message });
      socket.disconnect(true);
    }
  });

  return {
    app,
    io,
    httpServer,
    database,
    async close() {
      await new Promise((resolve) => io.close(resolve));
      database.close();
    },
  };
}
