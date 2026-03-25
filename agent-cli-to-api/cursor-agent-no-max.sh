#!/usr/bin/env bash
set -euo pipefail

# Wrapper for Cursor CLI to force max mode off before each prompt-style run.
# Intended for `agent -p ... <prompt>` style invocations (used by the gateway).

AGENT_BIN="${CURSOR_AGENT_REAL_BIN:-agent}"

if ! command -v "$AGENT_BIN" >/dev/null 2>&1; then
  echo "cursor-agent-no-max: agent binary not found: $AGENT_BIN" >&2
  exit 127
fi

args=("$@")
has_p=0
for arg in "${args[@]}"; do
  if [[ "$arg" == "-p" ]]; then
    has_p=1
    break
  fi
done

if [[ $has_p -eq 1 && ${#args[@]} -gt 0 ]]; then
  last_index=$((${#args[@]} - 1))
  original_prompt="${args[$last_index]}"

  if [[ "$original_prompt" == *"/max-mode off"* ]]; then
    exec "$AGENT_BIN" "${args[@]}"
  fi

  args[$last_index]="/max-mode off
$original_prompt"
  exec "$AGENT_BIN" "${args[@]}"
fi

# Interactive mode fallback: run as-is and print a reminder.
echo "cursor-agent-no-max: interactive session detected; run /max-mode off once after startup." >&2
exec "$AGENT_BIN" "${args[@]}"
