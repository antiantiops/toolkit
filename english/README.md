This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


### Progressive Writing analysis

Writing extracts source images once, then generates four smaller schema partitions using at most two workers. Single-page partitions: metadata, task brief, sections, supporting guidance. Dual-page partitions: metadata/sample context, task brief, sample analysis, task guidance/Word Bank. Each request receives only its output schema; source fidelity and speech metadata remain required. Grammar stays on its two existing partitions.

`GET /api/writing?jobId=...` includes extracted `source`, partition `parts`, dynamic `progress`, and merged `writing` as it becomes available. The client shows a dedicated partial-safe progress/source panel; the full Writing component mounts only when completed. Failed partitions retain extracted source and successful results for explicit retry. Owner-scoped deduplication and polling/reload recovery are unchanged. Completed results persist through the normal merged session cache; pending work is process-local and does not survive restart. No new queue, model switch or lazy omission of lesson features.

Checks: `node tests/writing-progress.mjs`, `node checks/writing-progress-browser.mjs` (`TEST_URL` supported), existing vocabulary pipeline, AI fallback and reconnect checks. Live synthetic single-task probe: acknowledgement 177ms; source observed at 18.3s; first partition 30.3s; full 4/4 at 66.4s. This fixture is not the earlier production lesson and does not establish a comparative speedup. Real sample/dual-page inference and authenticated Kong/mobile interaction need separate validation.

## Storage and safe deployment

See [storage inventory, mount design, migration, backup and recovery](docs/storage-and-deployment.md).
Run `python3 checks/storage-contract.py <docker-inspect.json>` before deployment.
