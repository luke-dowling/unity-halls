# Self-hosting LiveKit on Hetzner

This folder runs the LiveKit media server that Unity Halls uses for video, on a
single Hetzner Cloud VPS. The Next.js app can run anywhere (the same VPS,
Vercel, …); it only needs `LIVEKIT_URL`, `LIVEKIT_API_KEY` and
`LIVEKIT_API_SECRET` pointing at this server.

## 1. Create the server

- **Type:** a small shared-CPU instance is plenty for a few 6-person rooms
  (e.g. 2 vCPU / 4 GB). Video traffic is the main cost, and Hetzner includes
  generous traffic.
- **Image:** Ubuntu 24.04.
- Install Docker: `curl -fsSL https://get.docker.com | sh`

## 2. DNS

Create an **A record** for your LiveKit domain (e.g. `livekit.example.com`)
pointing at the server's public IPv4 address. Caddy needs this to get a TLS
certificate.

## 3. Firewall

In the Hetzner Cloud Console → Firewalls (and `ufw`, if you use it), allow
**inbound**:

| Port(s)       | Protocol | Purpose                              |
| ------------- | -------- | ------------------------------------ |
| 22            | TCP      | SSH                                  |
| 80, 443       | TCP      | Caddy (TLS certs + `wss://` signalling) |
| 7881          | TCP      | WebRTC over TCP (UDP-blocked networks) |
| 3478          | UDP      | Built-in TURN                        |
| 50000–60000   | UDP      | WebRTC media                         |

Do **not** open 7880 publicly — Caddy proxies it with TLS.

## 4. Start it

```bash
git clone https://github.com/luke-dowling/unity-halls.git
cd unity-halls/deploy/livekit
cp livekit.env.example livekit.env
nano livekit.env          # set LIVEKIT_DOMAIN, generate key + secret
docker compose --env-file livekit.env up -d
docker compose logs -f    # watch for errors
```

Check it's reachable: `https://<your-domain>` should answer `OK`.

## 5. Point the app at it

In the Next.js app's `.env` (or hosting provider's env settings):

```env
LIVEKIT_URL=wss://<your-domain>
LIVEKIT_API_KEY=<same key as livekit.env>
LIVEKIT_API_SECRET=<same secret as livekit.env>
```

You can test connectivity end-to-end with
[LiveKit's connection tester](https://livekit.io/connection-test) using a
token from `/api/livekit/token`.

## Updating

```bash
docker compose --env-file livekit.env pull
docker compose --env-file livekit.env up -d
```

## Notes

- TURN runs over UDP only. Players on very locked-down networks that block
  all UDP still connect via TCP 7881. TURN-over-TLS (port 443/5349) can be
  added later if anyone can't connect.
- Rooms are created on demand by the app (`unity-halls-<roomId>`), capped at
  6 participants, and close 5 minutes after the last person leaves.
