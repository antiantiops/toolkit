#!/bin/sh
# InitContainer entrypoint: copy extension artifacts to shared volume
set -e

TARGET="${EXTENSION_TARGET:-/opt/extensions}"

echo "Copying DocumentDB extension to ${TARGET}..."
cp -a /extensions/* "${TARGET}/"
echo "Done. Extensions ready at ${TARGET}"
