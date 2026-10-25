# CIA presentation

Source snapshot matching live image `ai-body:book-single-20261024` (2026-10-25).
Includes React/TypeScript slides, Node server, local icons, 3D models and
`public/media/claude-developer.mp4` video. Existing asset attribution files retained.

## Run locally

```sh
cd cia-slides
docker compose up -d --build
```

Open http://localhost:8090 (Docker Desktop required on Windows/macOS).

Build needs Internet to download Node image and npm packages. Presentation media
is bundled locally. External website links and optional real AI chat need Internet.
The default chat is explicitly a demo; real chat needs server-only `AI_BASE_URL`,
`AI_API_KEY` and `AI_MODEL` environment variables. Never put keys in frontend code.
Google login belongs to the external Kong gateway, not this container. Compose
binds localhost only; do not expose the unauthenticated backend publicly.

## Development

```sh
npm ci
npm test
npm run build
npm start
```

Production server listens on port 3000. Slide navigation supports the existing
language routes and URL hashes. Browser checks live in `checks/` (some retain
original test-host URLs and require adjustment for local execution).

This folder contains the presentation source and embedded video, not a Docker
image archive or a screen recording of the whole deck. Runtime secrets and
Google/Kong credentials are intentionally excluded.

## Docker Hub CI

Push to `master` changing `cia-slides/**` or its workflow builds and publishes
`antiantiops/cia-slides:latest` and `antiantiops/cia-slides:sha-<full-commit>`
for `linux/amd64` and `linux/arm64`. Manual runs use Actions → Build CIA Slides.
Uses existing repository secrets `DOCKER_HUB_USERNAME` and
`DOCKER_HUB_ACCESS_TOKEN` (write permission to the Docker Hub repository).

After a successful publication:

```sh
docker run -d --name cia-slides --restart unless-stopped \
  -p 127.0.0.1:8090:3000 antiantiops/cia-slides:latest
```
