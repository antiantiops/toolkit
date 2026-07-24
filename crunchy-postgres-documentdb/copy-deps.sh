#!/bin/bash
# Collect DocumentDB + PostGIS extension files and all their shared-library
# dependencies into /staging, preserving original paths.
set -euo pipefail

dst=/staging

# 1) PG extension shared objects (DocumentDB + PostGIS + deps already in /usr/pgsql-16)
mkdir -p "$dst/usr/pgsql-16/lib" "$dst/usr/pgsql-16/share/extension"
cp -a /usr/pgsql-16/lib/pg_documentdb*.so   "$dst/usr/pgsql-16/lib/"
cp -a /usr/pgsql-16/lib/documentdb*.so      "$dst/usr/pgsql-16/lib/" 2>/dev/null || true
cp -a /usr/pgsql-16/lib/postgis*.so         "$dst/usr/pgsql-16/lib/"
cp -a /usr/pgsql-16/lib/address_standardizer*.so "$dst/usr/pgsql-16/lib/" 2>/dev/null || true
cp -a /usr/pgsql-16/share/extension/documentdb* "$dst/usr/pgsql-16/share/extension/"
cp -a /usr/pgsql-16/share/extension/postgis*    "$dst/usr/pgsql-16/share/extension/"
cp -a /usr/pgsql-16/share/extension/address_standardizer* "$dst/usr/pgsql-16/share/extension/" 2>/dev/null || true

# PostGIS SQL contrib directory
if [ -d /usr/pgsql-16/share/contrib/postgis-3.6 ]; then
  mkdir -p "$dst/usr/pgsql-16/share/contrib"
  cp -a /usr/pgsql-16/share/contrib/postgis-3.6 "$dst/usr/pgsql-16/share/contrib/"
fi

# 2) libbson + Intel decimal math (DocumentDB build artifacts)
mkdir -p "$dst/usr/lib64" "$dst/usr/lib"
cp -a /usr/lib64/libbson-1.0.so* "$dst/usr/lib64/"
cp -a /usr/lib/intelmathlib "$dst/usr/lib/"

# 3) Resolve all non-PG shared library dependencies via ldd.
#    Only copy libs NOT already in the Crunchy base image (/lib64 basics).
for so in /usr/pgsql-16/lib/pg_documentdb.so /usr/pgsql-16/lib/postgis-3.so; do
  [ -f "$so" ] || continue
  ldd "$so" 2>/dev/null | awk '/=>/ && $3 ~ /^\// { print $3 }' | sort -u | while read -r lib; do
    case "$lib" in /usr/pgsql-16/*) continue ;; esac
    [ -f "$lib" ] || continue
    target_dir="$dst$(dirname "$lib")"
    mkdir -p "$target_dir"
    cp -an "$lib" "$target_dir/" 2>/dev/null || true
  done
done

echo "--- staged files ---"
find "$dst" -type f | sort | head -80
echo "total: $(find "$dst" -type f | wc -l) files"
