# Pilot and network deployment

The packaged demo is intentionally local-first. By default the server listens only on `127.0.0.1`, so other computers cannot open it.

## Recommended pilot architecture

Before giving a team shared access, place the hub behind company HTTPS and SSO on an internal host. Keep Ollama on that same private host or a controlled private AI endpoint.

Minimum pilot requirements:

- Company authentication and per-user authorization
- HTTPS through IIS, Caddy, nginx, or the company’s standard gateway
- An encrypted, per-user memory database with retention and deletion policy
- Audit logging that does not capture source documents or model prompts by default
- IT-managed host, backups, patching, monitoring, and model governance
- Legal/HR review of appropriate-use language and human-approval boundaries

The current browser-local memory is suitable for a single-person demo. It is not a substitute for authenticated organizational memory.

## Trusted-network evaluation

An IT owner can explicitly expose the server for a short internal evaluation:

```powershell
$env:HOST = "0.0.0.0"
$env:PORT = "3000"
node server.js
```

Then place a reverse proxy with HTTPS and authentication in front of port 3000 before sharing the address. Do not expose the raw Node port to the public internet.

The server accepts `HOST` and `PORT` environment variables. With the default settings, `start-hub.bat` remains loopback-only and opens `http://localhost:3000`.

## Important memory behavior

Saved conversations live in each user’s browser profile, not on the Node host. That gives the demo simple persistence and department isolation, but it also means:

- different browsers and computers do not share history;
- clearing browser site data deletes the saved conversations;
- anyone using the same unlocked browser profile can read them;
- storage is not encrypted at rest by this demo.

For a production pilot, replace browser-local persistence with authenticated, encrypted, access-controlled storage and show source/provenance for every retained fact.

## Public deployment

Do not publish this demo directly. Public deployment requires, at minimum, SSO, HTTPS, rate limiting, secrets management, tenant isolation, encrypted storage, data-loss controls, operational monitoring, and a reviewed incident-response plan.
