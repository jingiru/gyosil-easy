# Raspberry Pi 교실 화면 설치

## 준비

- Raspberry Pi 4 이상 권장
- Raspberry Pi OS with desktop 64비트
- 정전식 터치 디스플레이
- 방송실 PC와 통신 가능한 학교 내부망

먼저 Chromium에서 `http://방송실PC주소:3000/api/health`를 열어 `"ok": true`가 표시되는지 확인합니다.

## 자동 키오스크 설정

Raspberry Pi에서 저장소를 받은 뒤 실행합니다.

```bash
cd gyosil-easy/raspberry-pi
chmod +x install-kiosk.sh start-kiosk.sh
./install-kiosk.sh http://192.168.0.50:3000 classroom-1
sudo reboot
```

`192.168.0.50`은 방송실 PC 주소로, `classroom-1`은 이 기기가 설치될 교실 코드로 바꿉니다.

재부팅 후 스크립트는 서버가 응답할 때까지 기다렸다가 Chromium을 키오스크 모드로 엽니다. 화면 오른쪽 위의 전체 화면 버튼을 한 번 눌러 브라우저 UI를 숨길 수도 있습니다.

## 설정 변경

`~/.config/gyosil-easy.env`를 수정합니다.

```bash
export GYOSIL_SERVER_URL='http://192.168.0.50:3000'
export GYOSIL_ROOM='classroom-1'
```

## 터치 키보드

Raspberry Pi OS의 화면 키보드를 켜거나 `wvkbd` 같은 Wayland 호환 가상 키보드를 설치할 수 있습니다. 직접 답변 입력을 자주 쓰지 않는다면 프리셋 버튼만으로 운영해도 됩니다.

## 장애 확인 순서

1. 화면 왼쪽 위 연결 상태가 `실시간 연결됨`인지 봅니다.
2. 같은 Pi에서 `/api/health` 주소가 열리는지 확인합니다.
3. 방송실 PC가 켜져 있고 `npm start` 프로세스가 실행 중인지 봅니다.
4. Pi와 방송실 PC가 서로 격리된 VLAN/무선망에 있지 않은지 담당자에게 확인합니다.
