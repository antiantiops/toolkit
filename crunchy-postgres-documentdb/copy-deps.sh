#!/bin/bash
# Copy non-PG shared library dependencies of DocumentDB and PostGIS
# into the staging tree so the final Crunchy image has them at runtime.
set -euo pipefail

dst=/opt/documentdb

for so in /usr/pgsql-16/lib/pg_documentdb.so /usr/pgsql-16/lib/postgis-3.so; do
  [ -f "$so" ] || continue
  ldd "$so" | awk '/=>/ && $3 ~ /^\// { print $3 }' | while read -r lib; do
    # Skip libs that already live under the PG prefix (copied separately).
    case "$lib" in /usr/pgsql-16/*) continue ;; esac
    install -D -m 0755 "$lib" "${dst}${lib}"
  done
done

echo "--- staged library tree ---"
find "$dst" -type f -name '*.so*' | sort
