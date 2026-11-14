# Quick Vietnamese meanings

Order: local Lac Viet SQLite, VDict HTTPS (3s timeout), AI fallback. Old AI caches do not bypass dictionaries. Quick lookup applies dictionary-first ordering, while detailed explanation (/api/word) remains independent and automatic with AI enrichment and cache. Oxford IPA/audio unchanged. Other lesson generation/translation routes are unchanged.

Runtime database: `/data/dictionaries/lacviet.sqlite`, override with `LACVIET_DB_PATH`. Read-only connection. Do not place the database under public/ or commit it. Missing/unreadable dictionary falls back to VDict. POS groups and senses are retained, not selected according to sentence context.

Source: third-party LacVietExtract v1.1.0 `LacViet_English-Vietnamese.7z` from https://github.com/Meigyoku-Thmn/LacVietExtract/releases/tag/v1.1.0 . Metadata reports extraction through 2021-11-26; 163096 index records, 162758 normalized headwords after merging case/normalization duplicates. Public availability does not establish dictionary-content redistribution rights; do not publicly redistribute the dataset. Rights remain unverified.

Import: `python3 scripts/import-lacviet.py SOURCE_DIR OUTPUT_DB`. Verify SQLite integrity and sample records before deploying. Importer refuses existing output unless --force. Keep data on persistent /data mount, independent from build artifacts.

VDict: https://vdict.com/<word>,1,0,0.html ; exact h1 match and scoped translation blocks, never scripts/HTML returned to clients. Non-200, redirect, missing entry, parser mismatch or timeout falls through to AI. No bulk web crawl.

AI receives word, context and optional book definition. Current Vocabulary lesson's matching word.definition is sent by the main lookup modal. Direct searches without a lesson and arbitrary clicked words may have no definition; AI then uses context/general sense. AI quick cache keyed by word+definition+context. Detailed explanation uses existing /api/word independently for explanations/examples.

Checks: `LACVIET_DB_PATH=/tmp/lacviet-compare/lacviet.sqlite node checks/dictionary-meaning.mjs`. This verifies routing and fixtures, not audible playback or complete-corpus accuracy.
