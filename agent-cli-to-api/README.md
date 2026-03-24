# agent-cli-to-api Docker Image (Cursor First)

This folder provides a Dockerfile and GitHub Actions workflow to build a container image from:

- https://github.com/leeguooooo/agent-cli-to-api

The image is preconfigured for Cursor provider mode and is OpenAI-compatible on `/v1/*`.

Published images:

- `antiantiops/agent-cli-to-api:latest`
- `antiantiops/agent-cli-to-api:latest-devops` (includes `kubectl`)

## What gets built

- Base: `python:3.13-slim-bookworm`
- Installs upstream Python dependencies
- Installs Cursor CLI (`agent` binary)
- Starts gateway on `0.0.0.0:8000`
- Default provider: `cursor-agent`

## GitHub Action

Workflow file:

- `.github/workflows/build-agent-cli-to-api.yml`

What it does:

1. Clones `leeguooooo/agent-cli-to-api`
2. Copies this repo's `Dockerfile` and `Dockerfile_DevOps` into the cloned source
3. Builds multi-arch images (`linux/amd64`, `linux/arm64`)
4. Pushes base and DevOps tags to Docker Hub on non-PR runs

### Required repository secrets

- `DOCKER_HUB_USERNAME`
- `DOCKER_HUB_ACCESS_TOKEN`

### Manual run inputs

- `upstream_ref`: branch/tag to build (default `main`)
- `image_name`: destination image (default `antiantiops/agent-cli-to-api`)

## Local build

Clone upstream and build using this Dockerfile:

```bash
rm -rf /tmp/agent-cli-to-api-src
git clone --depth 1 https://github.com/leeguooooo/agent-cli-to-api /tmp/agent-cli-to-api-src
cp ./agent-cli-to-api/Dockerfile /tmp/agent-cli-to-api-src/Dockerfile
docker build -t agent-cli-to-api:local /tmp/agent-cli-to-api-src
```

## Run with Cursor API key (first use case)

Start container:

```bash
docker run --rm -p 8000:8000 \
  -e CURSOR_AGENT_API_KEY="<YOUR_CURSOR_API_KEY>" \
  -e CODEX_GATEWAY_TOKEN="devtoken" \
  -e CURSOR_AGENT_MODEL="auto" \
  agent-cli-to-api:local
```

Run DevOps image from Docker Hub:

```bash
docker run --rm -it antiantiops/agent-cli-to-api:latest-devops kubectl version --client
```

Notes:

- `CURSOR_AGENT_API_KEY` is passed to `cursor-agent --api-key ...`
- `CODEX_GATEWAY_TOKEN` protects your gateway API endpoint
- If you omit `CODEX_GATEWAY_TOKEN`, the API is unauthenticated

## Cursor client configuration

Use any OpenAI-compatible client settings:

- Base URL: `http://localhost:8000/v1`
- API key: `devtoken` (must match `CODEX_GATEWAY_TOKEN`)
- Model: any value (gateway is pinned to `cursor-agent` by default)

## Verify

Health check:

```bash
curl -s http://127.0.0.1:8000/healthz
```

Chat completion test:

```bash
curl -s http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer devtoken" \
  -d '{
    "model": "cursor:auto",
    "messages": [{"role": "user", "content": "Say hello in one sentence."}],
    "stream": false
  }'
```

## Common overrides

You can override defaults at runtime:

```bash
docker run --rm -p 8000:8000 \
  -e CURSOR_AGENT_API_KEY="<YOUR_CURSOR_API_KEY>" \
  -e CODEX_PROVIDER="cursor-agent" \
  -e CURSOR_AGENT_MODEL="gpt-5.3-codex" \
  -e CURSOR_AGENT_DISABLE_INDEXING="1" \
  -e CURSOR_AGENT_WORKSPACE="/tmp/cursor-empty-workspace" \
  -e CODEX_GATEWAY_TOKEN="devtoken" \
  agent-cli-to-api:local
```

## Troubleshooting: HTTP 500 `[Errno 7] Argument list too long`

If you see this error, the request prompt is too large for a CLI argument on your host.

Use a smaller prompt cap and enable debug logs:

```bash
docker run --rm -p 8000:8000 \
  -e CURSOR_AGENT_API_KEY="<YOUR_CURSOR_API_KEY>" \
  -e CODEX_GATEWAY_TOKEN="devtoken" \
  -e CURSOR_AGENT_MODEL="gpt-5.3-codex" \
  -e CURSOR_AGENT_DISABLE_INDEXING="1" \
  -e CODEX_MAX_PROMPT_CHARS="60000" \
  -e CODEX_LOG_LEVEL="debug" \
  -e CODEX_LOG_MODE="full" \
  -e CODEX_LOG_EVENTS="1" \
  agent-cli-to-api:local
```

Additional checks:

- Use streaming (`"stream": true`) so you can see token progress immediately.
- Reduce request history/context size from the client.
- Verify host argument limit with `getconf ARG_MAX`.
