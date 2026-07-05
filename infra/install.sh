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

# Interactive setup (password, bind, email) — required on first install
export MISTRAL_CONFIG="$CONFIG_FILE"
if [[ ! -f "$CONFIG_FILE" ]] || grep -qE '^  password_hash: ""$' "$CONFIG_FILE" 2>/dev/null || ! grep -q 'password_hash:' "$CONFIG_FILE" 2>/dev/null; then
  echo ""
  echo "==> First-time setup — you must set a web UI password"
  echo ""
  mistral setup
else
  echo "Config exists at $CONFIG_FILE (skipping setup — run 'mistral setup' to reconfigure)"
fi

echo ""
echo "==> Done!"
echo "  mistral          # chat TUI"
echo "  mistral report   # health report"
echo "  mistral test-email"
echo "  mistral setup    # reconfigure password / email / bind"
echo ""
echo "  sudo systemctl enable --now mistral-daemon"
echo "  sudo systemctl enable --now mistral-web"
echo ""
