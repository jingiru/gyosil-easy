# 방송실 Windows PC 설치

## 1. 준비

- Windows 10 또는 11 64비트
- Node.js 24 LTS 이상
- 학교 내부망에 유선 또는 Wi-Fi로 상시 연결
- 절전 및 자동 종료 해제

방송실 PC의 명령 창에서 `node --version`을 실행해 `v24` 이상인지 확인합니다.

## 2. 프로젝트 설치

저장소를 받을 폴더에서 다음을 실행합니다.

```powershell
git clone https://github.com/jingiru/gyosil-easy.git
Set-Location gyosil-easy
npm install
Copy-Item server/.env.example server/.env
npm run build
```

`server/.env`를 메모장으로 열어 다음 값을 확인합니다.

```dotenv
HOST=0.0.0.0
PORT=3000
DEFAULT_ROOM=classroom-1
DATABASE_PATH=./data/gyosil-easy.db
TEACHER_PIN=원하는숫자PIN
```

PIN을 쓰지 않으려면 `TEACHER_PIN=`처럼 비워둡니다.

## 3. 시험 실행

```powershell
npm start
```

명령 창에 표시되는 `교내 접속 주소`를 기록합니다. 예를 들어 `http://192.168.0.50:3000`입니다. 같은 학교 Wi-Fi에 연결한 휴대폰에서 이 주소가 열리면 서버 설치가 완료된 것입니다.

## 4. Windows 방화벽

휴대폰에서 주소가 열리지 않을 때는 먼저 학교 네트워크 담당자에게 내부 통신 허용 여부를 확인하세요. PC의 방화벽만 문제라는 것이 확인되면 관리자 PowerShell에서 아래 명령으로 TCP 3000번 인바운드를 허용합니다.

```powershell
New-NetFirewallRule -DisplayName "교실이지 서버" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

학교 정책상 네트워크 프로필이 Domain인 경우 담당자에게 규칙 등록을 요청하세요. Public 프로필 전체에 규칙을 열지는 않는 것을 권장합니다.

## 5. IP 주소 고정

서버 주소가 바뀌면 Raspberry Pi가 접속하지 못합니다. 공유기 또는 학교 DHCP 관리 화면에서 방송실 PC의 MAC 주소에 고정 임대(예약)를 설정하는 방식이 가장 안전합니다. 임의로 Windows에 고정 IP를 입력하면 학교의 다른 기기와 충돌할 수 있으니 네트워크 담당자와 협의하세요.

## 6. 로그인할 때 자동 시작

관리자 PowerShell에서 저장소 폴더로 이동한 뒤 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File server/scripts/install-startup-task.ps1
```

작업 스케줄러에 `GyosilEasyServer`가 생성됩니다. 방송실 PC가 자동 로그인하도록 이미 구성되어 있다면 로그인 직후 서버가 숨김 창으로 실행됩니다.

## 7. 운영 주소

- 교사용: `http://방송실PC주소:3000/#/teacher?room=classroom-1`
- 교실용: `http://방송실PC주소:3000/#/classroom?room=classroom-1`
- 상태 확인: `http://방송실PC주소:3000/api/health`

학교 밖 LTE/5G 접속은 이 버전에서 지원하지 않습니다. 공유기 포트 포워딩으로 서버를 인터넷에 직접 공개하지 마세요.
