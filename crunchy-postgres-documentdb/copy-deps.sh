#!/bin/bash
# Collect DocumentDB + PostGIS extension files and ALL runtime shared-library
# dependencies (recursively) into /staging, preserving paths under /usr.
# IMPORTANT: Never create /staging/lib64 — Crunchy base has /lib64 as a symlink
# to /usr/lib64 and buildkit COPY refuses to overwrite symlinks with directories.
set -euo pipefail

dst=/staging

# Normalize any /lib64/... path to /usr/lib64/...
normalize_path() {
  local p="$1"
  echo "$p" | sed 's|^/lib64/|/usr/lib64/|; s|^/lib/|/usr/lib/|'
}

# 1) PG extension shared objects
mkdir -p "$dst/usr/pgsql-16/lib" "$dst/usr/pgsql-16/share/extension"
cp -a /usr/pgsql-16/lib/pg_documentdb*.so   "$dst/usr/pgsql-16/lib/"
cp -a /usr/pgsql-16/lib/documentdb*.so      "$dst/usr/pgsql-16/lib/" 2>/dev/null || true
cp -a /usr/pgsql-16/lib/postgis*.so         "$dst/usr/pgsql-16/lib/"
cp -a /usr/pgsql-16/lib/address_standardizer*.so "$dst/usr/pgsql-16/lib/" 2>/dev/null || true
cp -a /usr/pgsql-16/lib/rum.so               "$dst/usr/pgsql-16/lib/" 2>/dev/null || true

# Extension control + SQL files
cp -a /usr/pgsql-16/share/extension/documentdb* "$dst/usr/pgsql-16/share/extension/"
cp -a /usr/pgsql-16/share/extension/postgis*    "$dst/usr/pgsql-16/share/extension/"
cp -a /usr/pgsql-16/share/extension/address_standardizer* "$dst/usr/pgsql-16/share/extension/" 2>/dev/null || true
cp -a /usr/pgsql-16/share/extension/rum*        "$dst/usr/pgsql-16/share/extension/" 2>/dev/null || true

# PostGIS SQL contrib
if [ -d /usr/pgsql-16/share/contrib/postgis-3.6 ]; then
  mkdir -p "$dst/usr/pgsql-16/share/contrib"
  cp -a /usr/pgsql-16/share/contrib/postgis-3.6 "$dst/usr/pgsql-16/share/contrib/"
fi

# 2) libbson + Intel decimal math
mkdir -p "$dst/usr/lib64" "$dst/usr/lib"
cp -a /usr/lib64/libbson-1.0.so* "$dst/usr/lib64/"
cp -a /usr/lib/intelmathlib "$dst/usr/lib/"

# 3) GEOS and PROJ live in non-standard prefixes on PGDG EL9.
#    PostGIS links libgeos_c and libproj but they are NOT in /usr/lib64.
for prefix in /usr/geos*/lib64 /usr/proj*/lib64; do
  [ -d "$prefix" ] || continue
  target="$dst$prefix"
  mkdir -p "$target"
  cp -a "$prefix"/*.so* "$target/" 2>/dev/null || true
  echo "Copied $prefix -> $target"
done

# 4) Recursively resolve remaining shared library dependencies via ldd.
visited=""
copy_lib() {
  local lib="$1"
  echo "$visited" | grep -qxF "$lib" && return 0
  visited="$visited
$lib"
  [ -f "$lib" ] || return 0
  # Resolve real path then normalize to /usr/lib64
  local real_lib
  real_lib=$(readlink -f "$lib")
  local norm_path
  norm_path=$(normalize_path "$real_lib")
  local target_dir="$dst$(dirname "$norm_path")"
  mkdir -p "$target_dir"
  cp -an "$real_lib" "$target_dir/$(basename "$norm_path")" 2>/dev/null || true
  # Recurse into this lib's dependencies
  local dep
  ldd "$real_lib" 2>/dev/null | awk '/=>/ && $3 ~ /^\// { print $3 }' | while read -r dep; do
    case "$dep" in /usr/pgsql-16/*) continue ;; esac
    echo "$visited" | grep -qxF "$dep" || copy_lib "$dep"
  done
}

# Seed from extension .so files
for so in /usr/pgsql-16/lib/pg_documentdb.so \
          /usr/pgsql-16/lib/pg_documentdb_core.so \
          /usr/pgsql-16/lib/postgis-3.so; do
  [ -f "$so" ] || continue
  ldd "$so" 2>/dev/null | awk '/=>/ && $3 ~ /^\// { print $3 }' | while read -r dep; do
    case "$dep" in /usr/pgsql-16/*) continue ;; esac
    copy_lib "$dep"
  done
done

# Safety: ensure /staging/lib64 does NOT exist (would conflict with Crunchy symlink)
rm -rf "$dst/lib64" "$dst/lib" 2>/dev/null || true

echo "--- staged files ---"
find "$dst" -type f | sort || true
echo "total: $(find "$dst" -type f | wc -l) files"
# Verify no /lib64 directory exists
if [ -e "$dst/lib64" ]; then
  echo "ERROR: /staging/lib64 exists — this will break COPY" >&2
  exit 1
fi
