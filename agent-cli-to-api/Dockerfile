FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1

RUN apt-get update && \
	DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
	  bash \
	  ca-certificates \
	  curl \
	  git && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Install Cursor CLI. The binary is exposed as `agent`.
RUN curl https://cursor.com/install -fsS | bash

ENV PATH="/root/.local/bin:${PATH}" \
	CURSOR_AGENT_BIN=agent

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
	pip install --no-cache-dir -r requirements.txt

COPY . .

# Install local package so `agent-cli-to-api` entrypoint is available.
RUN pip install --no-cache-dir .

EXPOSE 8000

# Cursor-first defaults (override with docker run -e ... when needed)
ENV CODEX_PROVIDER=cursor-agent \
	CURSOR_AGENT_MODEL=auto \
	CURSOR_AGENT_DISABLE_INDEXING=1

CMD ["agent-cli-to-api", "cursor-agent", "--host", "0.0.0.0", "--port", "8000"]
