# 모바일 화면 정적 호스팅

React 클라이언트는 `client/dist/`에 정적 파일로 빌드되며 웹 서버나 정적 호스팅 서비스에 올릴 수 있습니다. API와 Socket.IO는 `VITE_SERVER_URL`로 지정한 방송실 PC에 연결됩니다.

## 빌드

`client/.env.production`을 만듭니다.

```dotenv
VITE_SERVER_URL=http://192.168.0.50:3000
VITE_BACKUP_SERVER_URL=https://script.google.com/macros/s/AKfycbxltvehv2uEB4SJBMJQ72AvB2qPjcsVqYyOV5-ddHDVRM1Th5DOree10VLS1fRMBOOZrQ/exec
VITE_BACKUP_API_TIMEOUT_MS=15000
VITE_DEFAULT_ROOM=classroom-1
```

`VITE_SERVER_URL`에 `trycloudflare.com` Quick Tunnel 주소를 사용하면 터널을 다시 시작할 때 주소가
바뀌거나 사라질 수 있습니다. 방송실 PC를 계속 PRIMARY로 사용할 경우 Named Tunnel의 고정 HTTPS
호스트명을 사용합니다. `VITE_*` 값은 빌드 시 포함되므로 환경 변수를 바꾼 뒤 클라이언트를 다시
배포해야 합니다.

서버의 `server/.env`에는 정적 사이트 주소를 허용합니다.

```dotenv
ALLOWED_ORIGINS=http://192.168.0.60:8080
```

그다음 빌드합니다.

```powershell
npm run build --workspace client
```

## 중요한 브라우저 제한

GitHub Pages처럼 `https://`로 열린 페이지에서는 일반적으로 `http://192.168.x.x` 학교 서버로 보내는 요청이 혼합 콘텐츠로 차단됩니다. 따라서 1차 교내망 버전은 다음 중 하나를 권장합니다.

1. 가장 간단한 방식: 방송실 중앙 서버가 React 화면도 함께 제공하도록 `npm run build` 후 `npm start`
2. 별도 호스팅이 필요하면 학교 내부의 HTTP 정적 웹 서버에 `client/dist/` 배포

GitHub는 소스 코드와 업데이트를 관리하는 용도로 사용하고, 실제 모바일 화면은 방송실 서버 주소에서 여는 방식이 현재 범위에 가장 잘 맞습니다. 향후 학교 밖 접속과 HTTPS를 도입할 때 GitHub Pages 같은 외부 정적 호스팅을 다시 검토할 수 있습니다.

## 주소 형식

Hash 경로를 사용하므로 정적 서버에 별도 rewrite 설정이 없어도 됩니다.

- 교사용: `http://정적호스트/#/teacher?room=classroom-1`
- 교실용: `http://정적호스트/#/classroom?room=classroom-1`
