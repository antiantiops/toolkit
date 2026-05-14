# 9router Docker Image

This folder documents how to use the published Docker image for:

- https://github.com/decolua/9router

Published image:

- `antiantiops/9router:latest`

Default service port:

- `20128` (container listens on `0.0.0.0:20128`)

## Pull the image

```bash
docker pull antiantiops/9router:latest
```

## Quick start

Run the container and expose 9router on your host:

```bash
docker run -d \
  --name 9router \
  -p 20128:20128 \
  antiantiops/9router:latest \
  --no-browser --log --skip-update
```

Why these flags are recommended for Docker/headless servers:

- `--no-browser` prevents 9router from trying to open a local browser inside the container. The Web UI is still served normally.
- `--log` prints server logs to `docker logs`.
- `--skip-update` avoids the interactive update prompt/check in container deployments.

Open dashboard from your browser:

- `http://localhost:20128/dashboard`

Stop/remove container:

```bash
docker rm -f 9router
```

If you want persistent local data:

```bash
mkdir -p "$PWD/.9router-data"

docker run -d \
  --name 9router \
  -p 20128:20128 \
  -v "$PWD/.9router-data:/root/.9router" \
  antiantiops/9router:latest \
  --no-browser --log --skip-update
```

Check container logs:

```bash
docker logs -f 9router
```

## Docker Compose

Example compose file for headless/server deployments:

```yaml
services:
  9router:
    image: antiantiops/9router:latest
    container_name: 9router
    command: ["--no-browser", "--log", "--skip-update"]
    ports:
      - "20128:20128"
    volumes:
      - ./.9router-data:/root/.9router
    restart: unless-stopped
```

Start it:

```bash
docker compose up -d
```

Then open:

- `http://localhost:20128/dashboard`

## Client configuration (Google + Antigravity)

1. Start container with `-p 20128:20128` (above).
2. Open dashboard: `http://localhost:20128/dashboard`
3. Connect providers:
   - `Providers -> Connect Gemini CLI -> Google OAuth`
   - `Providers -> Connect Antigravity -> OAuth`
4. Copy your 9router API key from the dashboard.
5. Configure your client/tool to use 9router as OpenAI-compatible endpoint:

```text
Base URL: http://localhost:20128/v1
API Key: <your-9router-api-key>
Model: gc/... (Gemini) or ag/... (Antigravity)
```

Example environment for OpenAI-compatible clients:

```bash
export OPENAI_BASE_URL="http://localhost:20128/v1"
export OPENAI_API_KEY="<your-9router-api-key>"
```

Notes:

- If your client runs in another container, use host IP/DNS instead of `localhost`.
- Upstream currently marks `Gemini CLI` as deprecated/restricted by Google policy changes (Mar 2026). If Google OAuth fails, use another provider in 9router.

## Build locally

The image is built from upstream source (`decolua/9router`) using its `Dockerfile`.

```bash
rm -rf /tmp/9router-src
git clone --depth 1 https://github.com/decolua/9router /tmp/9router-src
docker build -t 9router:local /tmp/9router-src
```

Test local image:

```bash
docker run --rm -it 9router:local --help
```

## GitHub Actions workflow

Workflow file:

- `.github/workflows/build-9router.yml`

What it does:

1. Clones `decolua/9router` (default ref: `master`)
2. Builds multi-arch image (`linux/amd64`, `linux/arm64`)
3. Pushes tags to Docker Hub:
   - `latest`
   - short commit SHA (for example: `a1b2c3d`)

### Triggers

- Push to `master`
- Pull request to `master`
- Manual trigger (`workflow_dispatch`) with optional `source_ref`

### Required repository secrets

- `DOCKER_HUB_USERNAME`
- `DOCKER_HUB_ACCESS_TOKEN`

## Notes

- On pull requests, this workflow currently still attempts Docker Hub login/push. If secrets are unavailable for PR runs, the job may fail.
- Prefer SHA tags for reproducible deployments; use `latest` for convenience.
