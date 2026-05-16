FROM node:24-bookworm

# Runtime/build utilities aligned with upstream OpenClaw Dockerfile.
# tini gives proper signal handling when the image is run as a long-lived gateway.
RUN --mount=type=cache,id=openclaw-bookworm-apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=openclaw-bookworm-apt-lists,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl git hostname lsof openssl procps python3 tini && \
    update-ca-certificates

# Install Bun (required for build scripts). Keep existing curl installer for this
# custom toolkit image, but avoid browser downloads from optional deps.
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}" \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    OPENCLAW_PREFER_PNPM=1

RUN corepack enable

WORKDIR /app

ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN --mount=type=cache,id=openclaw-bookworm-apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=openclaw-bookworm-apt-lists,target=/var/lib/apt,sharing=locked \
    if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $OPENCLAW_DOCKER_APT_PACKAGES; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN --mount=type=cache,id=openclaw-pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    NODE_OPTIONS=--max-old-space-size=2048 pnpm install --frozen-lockfile \
      --config.supportedArchitectures.os=linux \
      --config.supportedArchitectures.cpu="$(node -p 'process.arch')" \
      --config.supportedArchitectures.libc=glibc

COPY . .

# Match upstream docker build path instead of the generic dev build.
RUN OPENCLAW_A2UI_SKIP_MISSING=1 pnpm_config_verify_deps_before_run=false pnpm canvas:a2ui:bundle || \
    (echo "A2UI bundle: creating stub (non-fatal)" && \
     mkdir -p extensions/canvas/src/host/a2ui && \
     echo "/* A2UI bundle unavailable in this build */" > extensions/canvas/src/host/a2ui/a2ui.bundle.js && \
     echo "stub" > extensions/canvas/src/host/a2ui/.bundle.hash && \
     rm -rf vendor/a2ui apps/shared/OpenClawKit/Tools/CanvasA2UI)
RUN NODE_OPTIONS=--max-old-space-size=8192 pnpm_config_verify_deps_before_run=false pnpm build:docker && echo "root pnpm build:docker completed"
RUN pnpm_config_verify_deps_before_run=false pnpm ui:build && echo "ui pnpm ui:build completed"
RUN pnpm_config_verify_deps_before_run=false pnpm qa:lab:build && echo "qa lab build completed"
RUN echo "Dockerfile build steps completed"

RUN ln -sf /app/openclaw.mjs /usr/local/bin/openclaw && \
    chmod 755 /app/openclaw.mjs && \
    install -d -m 0700 /root/.openclaw

ENV NODE_ENV=production

# Run as root for full container privileges
HEALTHCHECK --interval=3m --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["tini", "-s", "--"]
CMD ["node", "openclaw.mjs", "gateway", "--allow-unconfigured"]
