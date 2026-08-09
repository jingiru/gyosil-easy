# Google Apps Script 백업 API

이 API는 방송실 PC REST 서버가 꺼졌을 때 React 클라이언트가 사용하는 Spreadsheet 기반 백업입니다.
브라우저 CORS 제한을 피하기 위해 `/exec` 뒤에 REST 경로를 붙이지 않고 다음 규격을 사용합니다.

- 조회: `GET /exec?path=/api/config&method=GET`
- 쓰기: `POST /exec`, `Content-Type: text/plain`, JSON 본문에 `path`, `method`, `body`, `teacherPin` 전달
- 응답: 실제 논리 상태를 `{ "ok": true|false, "status": 200, "data": ... }` 봉투로 전달

## 배포

1. 스프레드시트에 연결된 Apps Script 프로젝트에서 `Code.gs`를 이 폴더의 코드로 교체합니다.
2. 프로젝트 설정의 스크립트 속성에 `SPREADSHEET_ID`를 추가하고 대상 스프레드시트 ID를 입력합니다.
3. 필요하면 `DEFAULT_ROOM`, `HISTORY_LIMIT`, `TEACHER_PIN`도 스크립트 속성에 추가합니다.
4. **배포 → 배포 관리 → 수정 → 새 버전**을 선택합니다.
5. 실행 사용자는 **나**, 액세스 권한은 **모든 사용자**로 배포합니다.
6. `/exec?path=/api/config&method=GET`을 로그인하지 않은 창에서 열어 아래 형태의 JSON을 확인합니다.

```json
{
  "ok": true,
  "status": 200,
  "data": {
    "defaultRoom": "classroom-1",
    "teacherPinRequired": false,
    "templates": [],
    "defaultCallOptions": []
  }
}
```

처음 정상 요청을 받으면 `Backup_Messages`, `Backup_Responses` 시트와 헤더를 자동으로 만듭니다.
기존 버전에서 사용하던 `messages` 시트는 그대로 보존합니다. Google Sheets는 시트 이름의
대소문자만 다른 `messages`와 `Messages`를 동시에 허용하지 않으므로 새 API는 충돌하지 않는
전용 탭을 사용합니다. 같은 이름의
시트에 다른 헤더가 이미 있으면 데이터를 덮어쓰지 않고 오류를 반환합니다.
