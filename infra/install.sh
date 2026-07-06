#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_DIR="/usr/local/lib/mistral"
BIN="/usr/local/bin/mistral"
CONFIG_DIR="/etc/mistral"
CONFIG_FILE="${MISTRAL_CONFIG:-$CONFIG_DIR/config.yaml}"

echo "==> Building mistral..."
cd "$ROOT"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm build

echo "==> Installing to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR" "$CONFIG_DIR"
rm -rf "$INSTALL_DIR"/*
cp -r "$ROOT"/node_modules "$ROOT"/package.json "$ROOT"/pnpm-workspace.yaml "$INSTALL_DIR"/
cp -r "$ROOT"/packages "$INSTALL_DIR"/

tee "$BIN" > /dev/null <<'EOF'
#!/usr/bin/env bash
export MISTRAL_CONFIG="${MISTRAL_CONFIG:-/etc/mistral/config.yaml}"
export MISTRAL_STATE="${MISTRAL_STATE:-/var/lib/mistral/state.json}"
if [[ -f /etc/mistral/secrets.env ]]; then
  set -a
  # shellcheck source=/dev/null
  source /etc/mistral/secrets.env
  set +a
fi
exec node /usr/local/lib/mistral/packages/cli/dist/index.js "$@"
EOF
chmod +x "$BIN"

mkdir -p /var/lib/mistral

if [[ ! -f "$CONFIG_DIR/secrets.env" ]]; then
  tee "$CONFIG_DIR/secrets.env.example" > /dev/null <<'EOF'
# Copy to secrets.env and fill in:
MISTRAL_API_KEY=
MISTRAL_PVE_TOKEN_SECRET=
SLACK_WEBHOOK_URL=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ALERT_EMAIL_TO=
EOF
  echo "Created $CONFIG_DIR/secrets.env.example"
fi

# systemd units
cp "$ROOT/infra/systemd/mistral-daemon.service" /etc/systemd/system/
cp "$ROOT/infra/systemd/mistral-web.service" /etc/systemd/system/
cp "$ROOT/infra/systemd/mistral-mcp.service" /etc/systemd/system/
systemctl daemon-reload

# First-time API/email setup (web password is set by start web below)
export MISTRAL_CONFIG="$CONFIG_FILE"
if [[ ! -f "$CONFIG_FILE" ]] || ! grep -q 'api_key:' "$CONFIG_FILE" 2>/dev/null; then
  echo ""
  echo "==> First-time setup (API key, email)"
  echo ""
  mistral setup
fi

echo ""
echo "==> Web dashboard (admin password + bind address)"
sudo mistral start web || mistral start web || true

echo ""
echo "==> Restarting services to load new build..."
systemctl restart mistral-web.service mistral-daemon.service 2>/dev/null || true

echo ""
echo "==> Done!"
echo "  mistral              # TUI chat"
echo "  mistral start web    # web dashboard + boot"
echo "  mistral report       # health report"
echo ""
