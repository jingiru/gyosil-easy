# 교실이지 (Gyosil Easy)

방송실의 상시 가동 Windows PC를 중앙 서버로 사용해, 교사 휴대폰과 교실 Raspberry Pi가 같은 학교 네트워크에서 실시간으로 소통하는 웹 애플리케이션입니다.

## 제공 기능

- 교사가 학생 이름과 장소를 지정해 호출 메시지 전송
- 교사가 프리셋 질문을 선택하거나 질문과 응답 버튼을 직접 구성
- 교실 터치 화면에서 버튼 응답 또는 직접 답변 입력
- Socket.IO 기반 실시간 전송과 연결 복구 후 자동 동기화
- SQLite 파일에 호출, 질문, 응답, 처리 상태 영구 저장
- 교사용 모바일 화면과 교실용 대형 터치 화면 분리
- 한 서버에서 여러 교실을 `room` 코드로 구분
- 선택형 교사 PIN 보호
- React 정적 빌드 또는 중앙 서버 통합 배포 지원

## 구조

```text
gyosil-easy/
├─ server/        Express + Socket.IO + SQLite 중앙 서버
├─ client/        React + Vite 교사용/교실용 웹 화면
├─ raspberry-pi/  키오스크 자동 실행 설정과 스크립트
└─ docs/          Windows 서버, Raspberry Pi, 네트워크 운영 문서
```

## 빠른 시작

Node.js 24 LTS 이상을 설치한 뒤 저장소 루트에서 실행합니다.

```powershell
npm install
Copy-Item server/.env.example server/.env
npm run dev
```

개발 화면:

- 교사용: `http://localhost:5173/#/teacher`
- 교실용: `http://localhost:5173/#/classroom?room=classroom-1`
- 서버 상태: `http://localhost:3000/api/health`

실제 방송실 PC에 배포할 때는 다음처럼 빌드 후 한 프로세스로 실행합니다.

```powershell
npm run build
npm start
```

같은 학교 네트워크의 기기에서 아래 주소로 접속합니다. `192.168.0.50`은 방송실 PC의 실제 IPv4 주소로 바꾸세요.

- 교사용: `http://192.168.0.50:3000/#/teacher`
- 교실용: `http://192.168.0.50:3000/#/classroom?room=classroom-1`

상세 설치는 [Windows 서버 설치 문서](docs/windows-server-setup.md), Raspberry Pi는 [키오스크 설치 문서](docs/raspberry-pi-setup.md)를 참고하세요. 클라이언트를 따로 배포하려면 [정적 호스팅 안내](docs/static-hosting.md)를 확인하세요.

## 정적 호스팅

클라이언트만 별도 정적 호스팅할 수 있습니다. `client/.env.production`에 학교 서버 주소를 지정하고 빌드합니다.

```dotenv
VITE_SERVER_URL=http://192.168.0.50:3000
VITE_DEFAULT_ROOM=classroom-1
```

```powershell
npm run build --workspace client
```

산출물은 `client/dist/`입니다. 학교 밖 접속, HTTPS 터널, 포트 포워딩은 이 1차 버전 범위에 포함하지 않습니다. HTTPS 정적 호스팅에서 HTTP 학교 서버로 접속하면 브라우저의 혼합 콘텐츠 정책으로 차단될 수 있으므로, 교내에서는 중앙 서버가 함께 제공하는 화면을 권장합니다.

## 주요 환경변수

서버 설정은 `server/.env`에서 관리합니다.

| 이름 | 기본값 | 설명 |
|---|---:|---|
| `PORT` | `3000` | 중앙 서버 포트 |
| `HOST` | `0.0.0.0` | 교내 다른 기기의 접속 허용 주소 |
| `DATABASE_PATH` | `./data/gyosil-easy.db` | SQLite 데이터 파일 |
| `ALLOWED_ORIGINS` | 비어 있음 | 별도 정적 호스팅 주소 목록(쉼표 구분) |
| `TEACHER_PIN` | 비어 있음 | 설정 시 교사의 전송/종료 요청 보호 |
| `DEFAULT_ROOM` | `classroom-1` | 기본 교실 코드 |

운영 환경 설정과 백업 방법은 [운영 안내](docs/operations.md)에 정리되어 있습니다.

## 명령어

```text
npm run dev      서버와 클라이언트 개발 모드 동시 실행
npm run build    클라이언트 정적 파일 생성
npm start        빌드된 화면을 포함한 중앙 서버 시작
npm test         서버 데이터 계층과 API 핵심 동작 검사
```

## 1차 버전의 보안 범위

이 버전은 신뢰할 수 있는 학교 내부망 전용입니다. `TEACHER_PIN`은 실수나 일반적인 오용을 줄이는 간단한 보호 수단이지, 인터넷 공개를 위한 완전한 인증 체계가 아닙니다. 라우터 포트 포워딩이나 공인 인터넷 공개는 하지 마세요.
