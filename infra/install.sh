#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_DIR="/usr/local/lib/mistral"
BIN="/usr/local/bin/mistral"
CONFIG_DIR="/etc/mistral"

echo "==> Building mistral..."
cd "$ROOT"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm build

echo "==> Installing to $INSTALL_DIR"
sudo mkdir -p "$INSTALL_DIR" "$CONFIG_DIR"
sudo rm -rf "$INSTALL_DIR"/*
sudo cp -r "$ROOT"/packages/*/dist "$ROOT"/node_modules "$ROOT"/package.json "$ROOT"/pnpm-workspace.yaml "$INSTALL_DIR"/
sudo cp -r "$ROOT"/packages "$INSTALL_DIR"/

sudo tee "$BIN" > /dev/null <<'EOF'
#!/usr/bin/env bash
exec node /usr/local/lib/mistral/packages/cli/dist/index.js "$@"
EOF
sudo chmod +x "$BIN"

if [[ ! -f "$CONFIG_DIR/secrets.env" ]]; then
  sudo tee "$CONFIG_DIR/secrets.env.example" > /dev/null <<'EOF'
MISTRAL_API_KEY=
MISTRAL_PVE_TOKEN_SECRET=
SLACK_WEBHOOK_URL=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
ALERT_EMAIL_TO=
EOF
  echo "Created $CONFIG_DIR/secrets.env.example — copy to secrets.env and fill in."
fi

sudo cp "$ROOT/infra/systemd/mistral-daemon.service" /etc/systemd/system/
sudo cp "$ROOT/infra/systemd/mistral-mcp.service" /etc/systemd/system/
sudo systemctl daemon-reload

echo "==> Done. Commands:"
echo "  mistral          # chat TUI"
echo "  mistral report   # health report"
echo "  mistral web      # settings UI"
echo "  sudo systemctl enable --now mistral-daemon"
