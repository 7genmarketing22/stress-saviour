#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Copy ${SCRIPT_DIR}/.env.example to ${ENV_FILE} and fill it in first." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "${ENV_FILE}"
set +a

: "${JITSI_DOMAIN:?JITSI_DOMAIN is required}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL is required}"
: "${JWT_APP_ID:?JWT_APP_ID is required}"
: "${JWT_APP_SECRET:?JWT_APP_SECRET is required}"

if [[ "${JWT_APP_SECRET}" == replace-* || ${#JWT_APP_SECRET} -lt 32 ]]; then
  echo "JWT_APP_SECRET must be a unique random secret of at least 32 characters." >&2
  exit 1
fi

UPSTREAM="${JITSI_UPSTREAM_DIR:-/opt/docker-jitsi-meet}"

if [[ ! -d "${UPSTREAM}/.git" ]]; then
  sudo mkdir -p "$(dirname "${UPSTREAM}")"
  sudo chown "$(id -u):$(id -g)" "$(dirname "${UPSTREAM}")"
  git clone https://github.com/jitsi/docker-jitsi-meet.git "${UPSTREAM}"
fi

cd "${UPSTREAM}"
git fetch --tags --prune
TAG="${JITSI_DOCKER_TAG:-$(git tag -l 'stable-*' --sort=-v:refname | head -n 1)}"
if [[ -z "${TAG}" ]]; then
  echo "No stable docker-jitsi-meet release tag was found." >&2
  exit 1
fi
git checkout "${TAG}"

cp env.example .env
./gen-passwords.sh

python3 - "${UPSTREAM}/.env" <<'PY'
import os
import sys
from pathlib import Path

path = Path(sys.argv[1])
updates = {
    "CONFIG": "/opt/jitsi-config",
    "HTTP_PORT": "80",
    "HTTPS_PORT": "443",
    "TZ": os.environ.get("TZ", "Asia/Karachi"),
    "PUBLIC_URL": f"https://{os.environ['JITSI_DOMAIN']}",
    "ENABLE_LETSENCRYPT": "1",
    "LETSENCRYPT_DOMAIN": os.environ["JITSI_DOMAIN"],
    "LETSENCRYPT_EMAIL": os.environ["LETSENCRYPT_EMAIL"],
    "LETSENCRYPT_ACME_SERVER": "letsencrypt",
    "ENABLE_AUTH": "1",
    "ENABLE_GUESTS": "0",
    "AUTH_TYPE": "jwt",
    "JWT_APP_ID": os.environ["JWT_APP_ID"],
    "JWT_APP_SECRET": os.environ["JWT_APP_SECRET"],
    "JWT_ACCEPTED_ISSUERS": os.environ["JWT_APP_ID"],
    "JWT_ACCEPTED_AUDIENCES": os.environ["JWT_APP_ID"],
    "JWT_ALLOW_EMPTY": "0",
    "ENABLE_LOBBY": "1",
    "ENABLE_AUTO_OWNER": "0",
    "ENABLE_MODERATOR_CHECKS": "1",
    "WAIT_FOR_HOST_DISABLE_AUTO_OWNERS": "true",
    "XMPP_MUC_MODULES": "token_affiliation",
    "ENABLE_XMPP_WEBSOCKET": "1",
    "ENABLE_JAAS_COMPONENTS": "0",
}

lines = path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    raw = line.lstrip("#")
    key = raw.split("=", 1)[0] if "=" in raw else ""
    if key in updates:
        if key not in seen:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
        continue
    out.append(line)

for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")

path.write_text("\n".join(out) + "\n")
PY

sudo mkdir -p /opt/jitsi-config
sudo chown -R "$(id -u):$(id -g)" /opt/jitsi-config
docker compose pull
docker compose up -d

echo
echo "Jitsi ${TAG} is starting at https://${JITSI_DOMAIN}"
echo "Open UDP 10000 and TCP 80/443 in the VPS firewall/security group."
echo "Use the same JWT_APP_ID and JWT_APP_SECRET in the Stress Saviour app."
