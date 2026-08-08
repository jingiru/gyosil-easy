# 운영과 백업

## 매일 확인

- 방송실 PC가 절전 모드로 들어가지 않는지 확인
- `http://서버주소:3000/api/health`가 열리는지 확인
- 교사용과 교실용 화면 모두 `실시간 연결됨`인지 확인

## 기록 백업

기록은 기본적으로 `server/data/gyosil-easy.db`에 있습니다. 일관된 백업을 위해 서버를 잠시 종료한 뒤 이 파일을 날짜가 포함된 안전한 폴더에 복사하고 서버를 다시 시작하세요.

```powershell
Copy-Item server/data/gyosil-easy.db "D:\GyosilEasyBackup\gyosil-easy-2026-08-09.db"
```

복사 대상 폴더와 날짜는 실제 환경에 맞게 바꿉니다. 학생 이름과 응답이 포함될 수 있으므로 개인 클라우드나 공개 폴더에는 올리지 마세요. `server/data/`는 Git에서 자동 제외됩니다.

## 업데이트

서버를 종료하고 저장소 폴더에서 다음 순서로 진행합니다.

```powershell
git pull
npm install
npm run build
npm test
npm start
```

업데이트 전 데이터베이스 백업을 권장합니다.

## 보관 정책

현재 1차 버전은 기록을 자동 삭제하지 않습니다. 학교의 개인정보 보관 지침에 맞춰 학기 말에 백업 후 데이터 파일을 교체하는 운영 정책을 정하세요. 파일 삭제는 서버가 완전히 종료된 상태에서만 진행해야 합니다.

## 장애 복구

- 서버 재시작: 작업 관리자에서 기존 Node.js 프로세스가 중복 실행 중인지 확인한 후 작업 스케줄러의 `GyosilEasyServer`를 실행합니다.
- DB 오류: 서버를 종료하고 손상 전 백업 파일로 `server/data/gyosil-easy.db`를 교체합니다.
- IP 변경: 방송실 PC에서 `ipconfig`로 현재 IPv4 주소를 확인하고 Raspberry Pi 설정을 갱신합니다.
- 응답 지연: 교사 휴대폰과 Pi가 같은 내부망에서 방송실 PC 주소에 직접 접근하는지 확인합니다.
