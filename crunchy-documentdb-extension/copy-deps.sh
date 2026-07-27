#!/bin/bash
# Collect DocumentDB extension files and runtime shared-library dependencies
# into /staging, preserving paths under /usr.
set -euo pipefail

dst=/staging

normalize_path() {
  echo "$1" | sed 's|^/lib64/|/usr/lib64/|; s|^/lib/|/usr/lib/|'
}

# 1) PG extension shared objects
mkdir -p "$dst/usr/pgsql-16/lib" "$dst/usr/pgsql-16/share/extension"
cp -a /usr/pgsql-16/lib/pg_documentdb*.so   "$dst/usr/pgsql-16/lib/"
cp -a /usr/pgsql-16/lib/documentdb*.so      "$dst/usr/pgsql-16/lib/" 2>/dev/null || true

# Extension control + SQL files
cp -a /usr/pgsql-16/share/extension/documentdb* "$dst/usr/pgsql-16/share/extension/"

# 2) libbson + Intel decimal math + pcre2
mkdir -p "$dst/usr/lib64" "$dst/usr/lib"
cp -a /usr/lib64/libbson-1.0.so* "$dst/usr/lib64/"
cp -a /usr/lib/intelmathlib "$dst/usr/lib/" 2>/dev/null || true
cp -a /usr/lib64/libpcre2-8.so* "$dst/usr/lib64/" 2>/dev/null || true

# 3) Recursively resolve shared library dependencies via ldd
visited=""
copy_lib() {
  local lib="$1"
  echo "$visited" | grep -qxF "$lib" && return 0
  visited="$visited
$lib"
  [ -f "$lib" ] || return 0
  local real_lib
  real_lib=$(readlink -f "$lib")
  local norm_path
  norm_path=$(normalize_path "$real_lib")
  local target_dir="$dst$(dirname "$norm_path")"
  mkdir -p "$target_dir"
  cp -an "$real_lib" "$target_dir/$(basename "$norm_path")" 2>/dev/null || true
  # Also copy the symlink name if different
  if [ "$(basename "$lib")" != "$(basename "$real_lib")" ]; then
    local link_norm
    link_norm=$(normalize_path "$lib")
    cp -an "$lib" "$dst$link_norm" 2>/dev/null || true
  fi
  local dep
  ldd "$real_lib" 2>/dev/null | awk '/=>/ && $3 ~ /^\// { print $3 }' | while read -r dep; do
    case "$dep" in /usr/pgsql-16/*) continue ;; esac
    echo "$visited" | grep -qxF "$dep" || copy_lib "$dep"
  done
}

# Seed from extension .so files
for so in /usr/pgsql-16/lib/pg_documentdb.so \
          /usr/pgsql-16/lib/pg_documentdb_core.so; do
  [ -f "$so" ] || continue
  ldd "$so" 2>/dev/null | awk '/=>/ && $3 ~ /^\// { print $3 }' | while read -r dep; do
    case "$dep" in /usr/pgsql-16/*) continue ;; esac
    copy_lib "$dep"
  done
done

# Safety: remove /lib64 if it appeared
rm -rf "$dst/lib64" "$dst/lib" 2>/dev/null || true

echo "--- staged files ---"
find "$dst" -type f | sort || true
echo "total: $(find "$dst" -type f | wc -l) files"
