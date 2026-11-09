<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Runtime data safety

Before deployment, container recreation, storage changes or recovery, read
`docs/storage-and-deployment.md`. Run its storage contract gate. Keep databases,
uploads and account preferences outside build artifacts. Back up with SQLite
backup API and compare per-account/week data before and after. HTTP 200 is not
proof of data preservation.
