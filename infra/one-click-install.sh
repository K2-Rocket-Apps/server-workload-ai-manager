#!/usr/bin/env bash
# One-click install for Proxmox VE hosts
# Usage: curl -fsSL https://raw.githubusercontent.com/K2-Rocket-Apps/server-workload-ai-manager/main/infra/one-click-install.sh | sudo bash
set -euo pipefail

REPO_URL="${MISTRAL_REPO_URL:-https://github.com/K2-Rocket-Apps/server-workload-ai-manager.git}"
INSTALL_DIR="${MISTRAL_INSTALL_DIR:-/opt/mistral}"
BRANCH="${MISTRAL_BRANCH:-main}"

echo "============================================"
echo "  Mistral PVE Agent — One-Click Install"
echo "============================================"
echo ""

# Require root (runs on PVE host)
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Re-running with sudo..."
  exec sudo bash "$0" "$@"
fi

# Node.js 20+
if ! command -v node &>/dev/null; then
  echo "==> Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# pnpm
if ! command -v pnpm &>/dev/null; then
  echo "==> Installing pnpm..."
  npm install -g pnpm
fi

# Clone or update
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "==> Updating existing install at $INSTALL_DIR"
  git -C "$INSTALL_DIR" fetch origin
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH" || true
else
  echo "==> Cloning to $INSTALL_DIR"
  rm -rf "$INSTALL_DIR"
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

# Run installer (build + systemd + interactive setup)
export MISTRAL_CONFIG="/etc/mistral/config.yaml"
bash "$INSTALL_DIR/infra/install.sh"

echo ""
echo "============================================"
echo "  Install complete!"
echo "============================================"
echo ""
echo "  Web UI:  check /etc/mistral/config.yaml → web.public_url"
echo "  Chat:    mistral"
echo "  Report:  mistral report"
echo "  Email:   mistral test-email"
echo ""
echo "  Services:"
echo "    systemctl status mistral-daemon"
echo "    systemctl status mistral-web"
echo ""
