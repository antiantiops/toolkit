# OpenClaw Docker Build

This folder contains the Dockerfile for building OpenClaw.

## Prerequisites

To build this image, you'll need the complete OpenClaw source code from:
https://github.com/openclaw/openclaw

## GitHub Actions (Automated Build)

This repository includes a GitHub Actions workflow that automatically builds the OpenClaw Docker image.

### Automatic Builds

The workflow runs automatically on:
- Push to `main` or `master` branch
- Pull requests to `main` or `master` branch

### Manual Builds

You can trigger a manual build:
1. Go to **Actions** tab in your GitHub repository
2. Select **Build OpenClaw Docker Image** workflow
3. Click **Run workflow**
4. Optionally specify extra apt packages to install
5. Click **Run workflow** button

### Image Location

Built images are pushed to Docker Hub:
```
antiantiops/openclaw:latest
```

### Pull the Image

```bash
docker pull antiantiops/openclaw:latest
```

### Setup Docker Hub Credentials

To enable automatic pushes to Docker Hub, add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add two secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username (antiantiops)
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token (create at https://hub.docker.com/settings/security)

## Build Instructions

1. **Clone the OpenClaw repository:**
   ```bash
   git clone https://github.com/openclaw/openclaw.git openclaw-source
   cd openclaw-source
   ```

2. **Copy the Dockerfile to the repository root:**
   ```bash
   cp ../Dockerfile .
   ```

3. **Build the Docker image:**
   ```bash
   docker build -t openclaw:local .
   ```

4. **Build with extra apt packages (optional):**
   ```bash
   docker build --build-arg OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential" -t openclaw:local .
   ```

5. **Build the DevOps variant with Cursor CLI and kubectl:**
   ```bash
   cp ../Dockerfile_DevOps .
   docker build -f Dockerfile_DevOps -t openclaw:devops .
   ```

## Run the Container

```bash
docker run -it --rm openclaw:local
```

## Notes

- The Dockerfile is based on Node.js 22 (Bookworm)
- It installs Bun for build scripts
- Uses pnpm for package management
- Builds both the core and UI components
- Includes Google Gemini CLI (`@google/gemini-cli`)
- `Dockerfile_DevOps` also installs Cursor CLI (`agent`) and `kubectl`

## Configuration

### Build Arguments

- `OPENCLAW_DOCKER_APT_PACKAGES` - Install additional apt packages during build (e.g., `ffmpeg build-essential`)

### Environment Variables

The GitHub Actions workflow supports:
- Manual trigger with custom apt packages
- Automatic versioning based on git commit SHA
- Multi-platform builds (configurable)
- Build caching for faster builds
