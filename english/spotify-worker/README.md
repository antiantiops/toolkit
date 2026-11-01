# Spotify Listening worker

Authenticated app accepts one Spotify track URL, strips query parameters, and queues by 22-character ID. spotDL resolves audio from external matching sources, not Spotify audio. Only download authorized content.

Host cache: `/home/docker/vocab-learner/data/spotify`, mounted `/data/spotify` in app and `/cache` in worker. Each account has an ownership marker; audio and lists require trusted Kong identity. Existing completed IDs reuse bytes. Native audio supports byte ranges and attachment download.

Worker container: `english-spotify-worker`, image `english-spotify-worker:20261101`, no ports, memory 768 MB, one CPU. Queue maximum three pending tracks; cache maximum 200 tracks; download timeout 600 seconds. Failed tracks currently require operator retry. No automatic eviction. A worker restart during a running download requires operator reconciliation of its state. Add retry/recovery before scaling beyond this single worker.

Build: `docker build -t english-spotify-worker:20261101 spotify-worker`
Run: `docker run -d --name english-spotify-worker --restart unless-stopped --memory=768m --cpus=1 -v /home/docker/vocab-learner/data/spotify:/cache english-spotify-worker:20261101`

Check: `node checks/spotify-contract.mjs` from english directory. Live controlled-identity check downloaded supplied track as `Cha Ching - Chris Nick`, 2721804 bytes; checked 206 range, attachment, unauthenticated 401, other account 404, completed cache reuse. This does not prove exact musical-version matching or actual phone playback.
