# Raspberry Pi 키오스크

Raspberry Pi는 별도 프로그램을 빌드하지 않고 Chromium으로 중앙 서버의 교실 화면을 전체 화면 실행합니다.

```bash
chmod +x install-kiosk.sh start-kiosk.sh
./install-kiosk.sh http://192.168.0.50:3000 classroom-1
```

주소와 교실 코드는 실제 환경에 맞게 변경하세요. 상세 내용은 [설치 문서](../docs/raspberry-pi-setup.md)에 있습니다.
