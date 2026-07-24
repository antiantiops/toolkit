#!/bin/bash
# Collect DocumentDB + PostGIS extension files and ALL runtime shared-library
# dependencies (recursively) into /staging, preserving original paths.
set -euo pipefail

dst=/staging

# 1) PG extension shared objects
mkdir -p "$dst/usr/pgsql-16/lib" "$dst/usr/pgsql-16/share/extension"
cp -a /usr/pgsql-16/lib/pg_documentdb*.so   "$dst/usr/pgsql-16/lib/"
cp -a /usr/pgsql-16/lib/documentdb*.so      "$dst/usr/pgsql-16/lib/" 2>/dev/null || true
cp -a /usr/pgsql-16/lib/postgis*.so         "$dst/usr/pgsql-16/lib/"
cp -a /usr/pgsql-16/lib/address_standardizer*.so "$dst/usr/pgsql-16/lib/" 2>/dev/null || true

# Extension control + SQL files
cp -a /usr/pgsql-16/share/extension/documentdb* "$dst/usr/pgsql-16/share/extension/"
cp -a /usr/pgsql-16/share/extension/postgis*    "$dst/usr/pgsql-16/share/extension/"
cp -a /usr/pgsql-16/share/extension/address_standardizer* "$dst/usr/pgsql-16/share/extension/" 2>/dev/null || true

# PostGIS SQL contrib
if [ -d /usr/pgsql-16/share/contrib/postgis-3.6 ]; then
  mkdir -p "$dst/usr/pgsql-16/share/contrib"
  cp -a /usr/pgsql-16/share/contrib/postgis-3.6 "$dst/usr/pgsql-16/share/contrib/"
fi

# 2) libbson + Intel decimal math (DocumentDB build artifacts)
mkdir -p "$dst/usr/lib64" "$dst/usr/lib"
cp -a /usr/lib64/libbson-1.0.so* "$dst/usr/lib64/"
cp -a /usr/lib/intelmathlib "$dst/usr/lib/"

# 3) Recursively resolve ALL shared library dependencies.
#    Walk the full dependency tree so indirect libs (libgeos_c, libproj, etc.)
#    are included even if not directly linked by the top-level .so.
collect_deps() {
  local visited="$1"
  local queue="$2"
  while [ -n "$queue" ]; do
    local current
    current=$(echo "$queue" | head -1)
    queue=$(echo "$queue" | tail -n +2)
    # Skip already visited or PG-prefix libs (copied above)
    echo "$visited" | grep -qxF "$current" && continue
    visited="$visited
$current"
    [ -f "$current" ] || continue
    # Copy lib to staging
    real_lib=$(readlink -f "$current")
    target_dir="$dst$(dirname "$real_lib")"
    mkdir -p "$target_dir"
    cp -an "$real_lib" "$target_dir/" 2>/dev/null || true
    # Also copy the symlink name if different
    if [ "$real_lib" != "$current" ]; then
      real_current=$(readlink -f "$current")
      sym_dir="$dst$(dirname "$current")"
      mkdir -p "$sym_dir"
      cp -an "$current" "$sym_dir/" 2>/dev/null || true
    fi
    # Add this lib's dependencies to the queue
    local new_deps
    new_deps=$(ldd "$real_lib" 2>/dev/null | awk '/=>/ && $3 ~ /^\// { print $3 }' | grep -v '^/usr/pgsql-16/' || true)
    if [ -n "$new_deps" ]; then
      queue="$queue
$new_deps"
    fi
  done
}

# Seed with direct deps of our extension .so files
seed_libs=""
for so in /usr/pgsql-16/lib/pg_documentdb.so \
          /usr/pgsql-16/lib/pg_documentdb_core.so \
          /usr/pgsql-16/lib/postgis-3.so; do
  [ -f "$so" ] || continue
  deps=$(ldd "$so" 2>/dev/null | awk '/=>/ && $3 ~ /^\// { print $3 }' | grep -v '^/usr/pgsql-16/' || true)
  seed_libs="$seed_libs
$deps"
done

collect_deps "" "$(echo "$seed_libs" | sort -u | grep -v '^$')"

echo "--- staged files ---"
find "$dst" -type f | sort || true
echo "total: $(find "$dst" -type f | wc -l) files"
