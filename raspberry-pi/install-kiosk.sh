#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${1:-http://192.168.0.50:3000}"
ROOM="${2:-classroom-1}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
AUTOSTART_DIR="${HOME}/.config/autostart"
ENV_FILE="${HOME}/.config/gyosil-easy.env"
LAUNCHER_DIR="${HOME}/.local/bin"
LAUNCHER="${LAUNCHER_DIR}/gyosil-easy-kiosk"

mkdir -p "$AUTOSTART_DIR" "$LAUNCHER_DIR"

cat > "$ENV_FILE" <<EOF
export GYOSIL_SERVER_URL='$SERVER_URL'
export GYOSIL_ROOM='$ROOM'
EOF

cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
source '$ENV_FILE'
exec '$SCRIPT_DIR/start-kiosk.sh'
EOF

cat > "${AUTOSTART_DIR}/gyosil-easy.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Gyosil Easy Classroom
Comment=교실이지 터치 화면
Exec=$LAUNCHER
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

chmod +x "${SCRIPT_DIR}/start-kiosk.sh" "$LAUNCHER"
echo "설정이 완료되었습니다. Raspberry Pi를 재부팅하면 교실 화면이 자동으로 열립니다."
echo "서버: $SERVER_URL"
echo "교실 코드: $ROOM"
