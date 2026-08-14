# 9router Docker Image

Published image for [decolua/9router](https://github.com/decolua/9router):

```text
antiantiops/9router:<version>
antiantiops/9router:latest
```

Service port: `20128`.

## Run

The upstream image already has its startup command:

```dockerfile
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "custom-server.js"]
```

Do not append legacy CLI flags such as `--no-browser`, `--log`, or
`--skip-update`. The entrypoint executes `su-exec node "$@"`; flags would be
interpreted as a Node executable and the container exits with:

```text
su-exec: --no-browser: No such file or directory
```

Run a pinned version:

```bash
docker run -d \
  --name 9router \
  -p 20128:20128 \
  -v "$PWD/.9router-data:/app/data" \
  --restart unless-stopped \
  antiantiops/9router:0.5.55
```

Open dashboard:

```text
http://localhost:20128/dashboard
```

Logs:

```bash
docker logs -f 9router
```

## Docker Compose

```yaml
services:
  9router:
    image: antiantiops/9router:0.5.55
    container_name: 9router
    ports:
      - "20128:20128"
    volumes:
      - ./.9router-data:/app/data
    restart: unless-stopped
```

Start or update:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

No `command:` override. Use image default command.

## Client config

```text
Base URL: http://localhost:20128/v1
API Key: <9router-api-key>
Model: gc/... or ag/...
```

If client runs in another container, use host IP/DNS instead of `localhost`.

## Build provenance

Workflow: `.github/workflows/build-9router.yml`.

1. `9router Release Watch (n8n)` reads semantic tags from
   `decolua/9router`.
2. It pins version, upstream tag, and upstream commit SHA in build workflow.
3. GitHub Actions checks out that exact SHA, verifies `cli/package.json`
   version, builds upstream `Dockerfile`, then pushes multi-arch image
   (`linux/amd64`, `linux/arm64`).
4. Image labels retain upstream source, tag, and commit SHA.

This prevents a moving `master` branch or a retagged release from silently
changing an already-selected build.
