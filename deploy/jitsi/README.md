# Free self-hosted Jitsi for Stress Saviour

This deploys the official `docker-jitsi-meet` stable release with Prosody JWT
authentication and lobby support. It does not use JaaS or another paid video
service.

## Server requirements

- A Linux VPS with a public IPv4 address (2 CPU / 4 GB RAM recommended).
- Docker Engine, Docker Compose v2, Git, Bash, and Python 3.
- DNS `A` record such as `meet.example.com` pointing to the VPS.
- Firewall ports: TCP `80`, TCP `443`, and UDP `10000`.

Vercel/serverless hosting cannot run Jitsi itself because the videobridge needs
long-running containers and UDP. The Next.js app may remain on Vercel.

## Deploy

Copy this directory to the VPS, then:

```bash
cd deploy/jitsi
cp .env.example .env
# Edit .env. Generate the shared secret with:
openssl rand -hex 32
chmod +x configure.sh
./configure.sh
```

The script clones the official Jitsi Docker repository, checks out its newest
stable release, generates internal XMPP passwords, enables Let's Encrypt,
Prosody JWT auth, token-based owner/member roles, and lobby, then starts the
stack. Anonymous guests are disabled; both doctor and patient use app-issued
tokens and therefore never see a Jitsi login form.

## Configure Stress Saviour

Set these production environment variables on the Next.js deployment:

```env
JITSI_DOMAIN=meet.example.com
JITSI_APP_ID=stress-saviour
JITSI_APP_SECRET=<same JWT_APP_SECRET as the VPS>
JITSI_ROOM_SECRET=<a different random secret>
```

Redeploy the app after setting them. Never expose `JITSI_APP_SECRET` through a
`NEXT_PUBLIC_*` variable or commit either secret.

## Expected flow

1. The join API verifies the Supabase user, appointment participant, payment,
   status, and time window.
2. It issues a fresh HS256 JWT for at most 15 minutes, never beyond the
   scheduled appointment end.
3. Doctor tokens contain `moderator: true`; patient tokens contain
   `moderator: false`.
4. The doctor creates the conference and enables Jitsi lobby mode.
5. A patient who arrived early waits in the app. Once the doctor starts, the
   patient enters Jitsi's lobby and the doctor admits them.
6. Old/cancelled/expired appointment links cannot obtain a fresh token.

JWTs are deliberately short-lived and include a unique `jti`. Prosody JWT is
stateless, so strict cryptographic single-use enforcement would require a
custom Prosody replay-cache plugin; the short TTL plus server-side appointment
checks prevents reusable permanent links.

## Update or restart

Re-run `configure.sh` to select the latest stable upstream tag and recreate the
containers. To inspect health:

```bash
cd /opt/docker-jitsi-meet
docker compose ps
docker compose logs --tail=100 prosody jicofo jvb web
```

For production upgrades, back up `/opt/jitsi-config` first.
