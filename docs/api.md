# API와 실시간 이벤트

## REST API

| 메서드 | 주소 | 용도 | 교사 PIN |
|---|---|---|---|
| `GET` | `/api/health` | 서버/DB 상태 확인 | 불필요 |
| `GET` | `/api/config` | 기본 교실, 프리셋, PIN 사용 여부 | 불필요 |
| `GET` | `/api/state?room=classroom-1` | 진행 중 메시지와 최근 기록 | 불필요 |
| `POST` | `/api/messages` | 호출 또는 질문 생성 | 필요 시 `x-teacher-pin` |
| `POST` | `/api/messages/:id/responses` | 학생 응답 저장 | 불필요 |
| `POST` | `/api/messages/:id/close` | 교사가 메시지 종료 | 필요 시 `x-teacher-pin` |

## 메시지 예시

```json
{
  "room": "classroom-1",
  "type": "question",
  "target": "",
  "message": "교실 지금 덥니?",
  "responseOptions": ["네, 더워요 🥵", "괜찮아요 🙂", "추워요 🥶"],
  "allowText": true
}
```

## Socket.IO

연결할 때 `auth.room`에 교실 코드를 전달합니다.

```js
io(SERVER_URL, { auth: { room: 'classroom-1' } });
```

서버가 보내는 이벤트:

- `server:ready`: 교실 채널 참가 완료
- `message:new`: 새 호출 또는 질문
- `response:new`: 새 학생 응답과 갱신된 메시지
- `message:closed`: 교사가 종료한 메시지
- `server:error`: 잘못된 교실 코드 등 연결 오류

클라이언트는 재연결 직후 `/api/state`를 다시 조회해야 합니다. 현재 React 클라이언트에는 이 동작이 구현되어 있습니다.

## 백업 API 호환 규칙

Google Apps Script 백업 API도 위 REST 주소, 상태 코드, JSON 요청/응답을 그대로 구현합니다.
클라이언트는 PRIMARY 요청이 연결 오류, 시간 초과, `408`, `429`, `5xx`로 실패할 때만 BACKUP에
같은 경로와 요청을 전달합니다. 따라서 유효성 검사 실패(`400`), PIN 오류(`401`), 없는 메시지
(`404`), 종료된 메시지(`409`)는 백업 전환 조건이 아닙니다.
