#!/usr/bin/env python3
"""
scripts/import-lacviet.py
Import StarDict Lac Viet English-Vietnamese dictionary into SQLite.
Database target: /tmp/lacviet-compare/lacviet.sqlite or argv[2]
Usage: python3 scripts/import-lacviet.py [--force] [SOURCE_DIR] [OUTPUT_DB]
"""

import gzip
import json
import os
import sqlite3
import struct
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

DEFAULT_SOURCE_DIR = "/tmp/lacviet-compare/extracted/Lạc Việt - Từ điển Anh-Việt"
DEFAULT_OUTPUT_DB = "/tmp/lacviet-compare/lacviet.sqlite"

class LacVietParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tag_stack = []
        self.stop_processing = False
        self.pos_groups = []
        self.current_pos = ""
        self.current_senses = []
        self.buffer = []

    def handle_starttag(self, tag, attrs):
        if self.stop_processing:
            return
        self.tag_stack.append(tag)
        if tag in ("d-meta", "d-def"):
            self.buffer = []

    def handle_endtag(self, tag):
        if self.stop_processing:
            return
        if tag == "d-meta":
            content = unicodedata.normalize("NFKC", "".join(self.buffer)).strip()
            lower = content.lower()
            if any(s in lower for s in ["thesaurus", "từ liên quan", "mục từ"]):
                self.stop_processing = True
                if self.current_pos or self.current_senses:
                    self.pos_groups.append({"pos": self.current_pos, "senses": self.current_senses})
                    self.current_pos = ""
                    self.current_senses = []
            else:
                if self.current_pos or self.current_senses:
                    self.pos_groups.append({"pos": self.current_pos, "senses": self.current_senses})
                    self.current_senses = []
                self.current_pos = content
        elif tag == "d-def":
            content = unicodedata.normalize("NFKC", "".join(self.buffer)).strip()
            clean_sense = " ".join(content.split())
            if clean_sense and not self.stop_processing:
                self.current_senses.append(clean_sense)
        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()

    def handle_data(self, data):
        if self.stop_processing:
            return
        if "d-meta" in self.tag_stack or "d-def" in self.tag_stack:
            self.buffer.append(data)

    def finish(self):
        if (self.current_pos or self.current_senses) and not self.stop_processing:
            self.pos_groups.append({"pos": self.current_pos, "senses": self.current_senses})
            self.current_pos = ""
            self.current_senses = []
        return self.pos_groups

def import_dictionary(source_dir_path, output_db_path, overwrite=False):
    source_dir = Path(source_dir_path)
    idx_gz = source_dir / "lv-[en-vi].idx.gz"
    dict_dz = source_dir / "lv-[en-vi].dict.dz"
    ifo_file = source_dir / "lv-[en-vi].ifo"

    if not idx_gz.is_file() or not dict_dz.is_file():
        raise FileNotFoundError(f"Missing required StarDict files in {source_dir}")

    output_db = Path(output_db_path)
    if output_db.exists() and not overwrite:
        raise FileExistsError(f"Target DB {output_db} exists. Use --force to overwrite.")

    output_db.parent.mkdir(parents=True, exist_ok=True)
    temp_db = output_db.with_suffix(".tmp.sqlite")
    if temp_db.exists():
        temp_db.unlink()

    # Read expected word count from .ifo if present
    expected_count = 163096
    if ifo_file.exists():
        for line in ifo_file.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith("wordcount="):
                expected_count = int(line.split("=")[1].strip())
                break

    print(f"Reading idx from {idx_gz}...")
    with gzip.open(idx_gz, "rb") as f:
        idx_data = f.read()

    print(f"Reading dict from {dict_dz}...")
    with gzip.open(dict_dz, "rb") as f:
        dict_data = f.read()

    pos = 0
    n = len(idx_data)
    idx_count = 0

    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode = OFF")
    cursor.execute("PRAGMA synchronous = OFF")
    cursor.execute("""
        CREATE TABLE words (
            word TEXT PRIMARY KEY,
            entries TEXT NOT NULL
        )
    """)

    batch = []
    entries_map = {}

    print("Parsing index & dictionary...")
    while pos < n:
        null_pos = idx_data.find(b"\x00", pos)
        if null_pos == -1:
            break
        raw_word = idx_data[pos:null_pos].decode("utf-8", errors="replace")
        offset, size = struct.unpack(">II", idx_data[null_pos + 1 : null_pos + 9])
        idx_count += 1
        pos = null_pos + 9

        norm_word = unicodedata.normalize("NFKC", raw_word).strip().lower()
        if not norm_word:
            continue

        raw_entry = dict_data[offset : offset + size].decode("utf-8", errors="replace")
        parser = LacVietParser()
        parser.feed(raw_entry)
        parsed_groups = parser.finish()

        if norm_word not in entries_map:
            entries_map[norm_word] = parsed_groups
        else:
            existing = entries_map[norm_word]
            for g in parsed_groups:
                g_pos = g["pos"]
                match = next((x for x in existing if x["pos"].lower() == g_pos.lower()), None)
                if match:
                    for s in g["senses"]:
                        if s not in match["senses"]:
                            match["senses"].append(s)
                else:
                    existing.append(g)

    if idx_count != expected_count:
        raise ValueError(f"Integrity check failed: read {idx_count} entries, expected {expected_count}")

    print(f"Index count check passed: {idx_count} entries. Unique normalized words: {len(entries_map)}.")

    print("Inserting into SQLite...")
    for word, groups in entries_map.items():
        batch.append((word, json.dumps(groups, ensure_ascii=False)))
        if len(batch) >= 10000:
            cursor.executemany("INSERT INTO words (word, entries) VALUES (?, ?)", batch)
            batch = []

    if batch:
        cursor.executemany("INSERT INTO words (word, entries) VALUES (?, ?)", batch)

    conn.commit()
    conn.close()

    temp_db.replace(output_db)
    print(f"Successfully generated database: {output_db}")

    verify_conn = sqlite3.connect(output_db)
    verify_cur = verify_conn.cursor()
    test_words = ["blemish", "compromise", "cover", "engineer"]
    for tw in test_words:
        row = verify_cur.execute("SELECT entries FROM words WHERE word = ?", (tw,)).fetchone()
        if not row:
            raise ValueError(f"Verification failed: sample word '{tw}' missing in DB!")
        parsed = json.loads(row[0])
        print(f"Verified sample '{tw}': {len(parsed)} POS groups found.")
    verify_conn.close()
    print("All integrity and sample checks passed!")

if __name__ == "__main__":
    args = sys.argv[1:]
    overwrite = False
    if "--force" in args:
        overwrite = True
        args.remove("--force")
    src = args[0] if len(args) > 0 else DEFAULT_SOURCE_DIR
    out = args[1] if len(args) > 1 else DEFAULT_OUTPUT_DB
    import_dictionary(src, out, overwrite=overwrite)
