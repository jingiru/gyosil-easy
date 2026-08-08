import os from 'node:os';
import { createGyosilServer } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const server = createGyosilServer(config);

function findLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

server.httpServer.listen(config.port, config.host, () => {
  console.log(`교실이지 서버가 http://localhost:${config.port} 에서 실행 중입니다.`);
  for (const address of findLanAddresses()) {
    console.log(`교내 접속 주소: http://${address}:${config.port}`);
  }
  console.log(`기본 교실 코드: ${config.defaultRoom}`);
  console.log(`교사 PIN: ${config.teacherPin ? '사용' : '사용 안 함'}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} 신호를 받아 서버를 종료합니다.`);
  await server.close();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
