#!/usr/bin/env bash
# One-click install for Proxmox VE hosts (private K2-Rocket-Apps repo).
#
# Public curl will 404 — repo is private. Use ONE of:
#
#   export GITHUB_TOKEN=ghp_...   # fine-grained PAT, repo read
#   curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" \
#     https://api.github.com/repos/K2-Rocket-Apps/server-workload-ai-manager/contents/infra/one-click-install.sh?ref=main \
#     | jq -r .content | base64 -d | sudo -E bash
#
# Or clone directly:
#   export GITHUB_TOKEN=ghp_...
#   git clone https://x-access-token:${GITHUB_TOKEN}@github.com/K2-Rocket-Apps/server-workload-ai-manager.git /opt/mistral
#   sudo bash /opt/mistral/infra/install.sh
set -euo pipefail

REPO="K2-Rocket-Apps/server-workload-ai-manager"
REPO_HTTPS="https://github.com/${REPO}.git"
INSTALL_DIR="${MISTRAL_INSTALL_DIR:-/opt/mistral}"
BRANCH="${MISTRAL_BRANCH:-main}"

clone_url() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    echo "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git"
  elif [[ -n "${GH_TOKEN:-}" ]]; then
    echo "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git"
  else
    echo "$REPO_HTTPS"
  fi
}

echo "============================================"
echo "  Mistral PVE Agent — One-Click Install"
echo "============================================"
echo ""

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Re-running with sudo..."
  exec sudo -E bash "$0" "$@"
fi

if [[ -z "${GITHUB_TOKEN:-}" && -z "${GH_TOKEN:-}" ]]; then
  echo "NOTE: This is a private repo. Set GITHUB_TOKEN (read access) before install."
  echo "  export GITHUB_TOKEN=ghp_your_token"
  echo ""
fi

if ! command -v node &>/dev/null; then
  echo "==> Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs git jq
fi

if ! command -v git &>/dev/null; then
  apt-get install -y git
fi

if ! command -v pnpm &>/dev/null; then
  echo "==> Installing pnpm..."
  npm install -g pnpm
fi

URL="$(clone_url)"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "==> Updating existing install at $INSTALL_DIR"
  git -C "$INSTALL_DIR" remote set-url origin "$URL"
  git -C "$INSTALL_DIR" fetch origin
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH" || true
else
  echo "==> Cloning to $INSTALL_DIR"
  rm -rf "$INSTALL_DIR"
  if ! git clone --branch "$BRANCH" --depth 1 "$URL" "$INSTALL_DIR"; then
    echo ""
    echo "ERROR: git clone failed. Private repo needs a token:"
    echo "  export GITHUB_TOKEN=ghp_...   # repo read on server-workload-ai-manager"
    echo "  sudo -E bash $0"
    exit 1
  fi
fi

export MISTRAL_CONFIG="/etc/mistral/config.yaml"
bash "$INSTALL_DIR/infra/install.sh"

echo ""
echo "============================================"
echo "  Install complete!"
echo "============================================"
echo ""
echo "  sudo systemctl enable --now mistral-daemon mistral-web"
echo "  mistral report"
echo "  mistral test-email"
echo ""
