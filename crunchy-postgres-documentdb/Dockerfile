# syntax=docker/dockerfile:1.7
# Crunchy PostgreSQL 16 + DocumentDB extension.
# Build directly on Crunchy base (UBI9/RHEL9) — all system libs stay intact.

ARG CRUNCHY_IMAGE=registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi9-16.14-2621
ARG DOCUMENTDB_REF=v0.107-0

FROM ${CRUNCHY_IMAGE} AS builder
ARG DOCUMENTDB_REF

USER root

# Install build tools and PG16 extension dependencies from PGDG.
# Crunchy UBI9 already has PG16 runtime; we add -devel + build deps.
RUN dnf -y install dnf-plugins-core epel-release && \
    dnf config-manager --set-enabled crb && \
    dnf -y swap curl-minimal curl || true && \
    dnf -y install git gcc gcc-c++ make cmake which tar findutils redhat-rpm-config \
      libicu-devel krb5-devel openssl-devel cyrus-sasl-devel snappy-devel \
      zlib-devel libcurl-devel libuuid-devel lz4-devel bzip2-devel \
      llvm-toolset clang-devel llvm-devel perl-IPC-Run && \
    dnf -y install postgresql16-devel postgresql16-server \
      pgvector_16 pg_cron_16 postgis36_16 rum_16 && \
    mkdir -p /usr/lib64/llvm20 /usr/lib64/llvm21 && \
    ln -sf /usr/bin /usr/lib64/llvm20/bin && \
    ln -sf /usr/bin /usr/lib64/llvm21/bin && \
    dnf clean all

WORKDIR /src
RUN git clone --depth 1 --branch "${DOCUMENTDB_REF}" https://github.com/documentdb/documentdb.git .

# Build DocumentDB dependencies (libbson, PCRE2, Intel decimal math) + extension.
RUN cp -a /src/scripts /tmp/documentdb-setup && \
    export INSTALL_DEPENDENCIES_ROOT=/tmp/documentdb-setup && \
    MAKE_PROGRAM=cmake /tmp/documentdb-setup/install_setup_libbson.sh && \
    /tmp/documentdb-setup/install_setup_pcre2.sh && \
    /tmp/documentdb-setup/install_setup_intel_decimal_math_lib.sh && \
    make PG_CONFIG=/usr/pgsql-16/bin/pg_config PG_CFLAGS='-std=gnu99 -Wall -Wno-error' install-no-distributed && \
    test -f /usr/pgsql-16/share/extension/documentdb.control && \
    test -f /usr/pgsql-16/lib/pg_documentdb.so

# Clean up build-only packages to slim down the image, keep runtime libs.
RUN dnf -y remove gcc gcc-c++ make cmake llvm-toolset clang-devel llvm-devel \
      postgresql16-devel perl-IPC-Run || true && \
    dnf clean all && \
    rm -rf /src /tmp/documentdb-setup

# Verify all extensions are loadable.
RUN test -f /usr/pgsql-16/share/extension/documentdb.control && \
    test -f /usr/pgsql-16/lib/pg_documentdb.so && \
    test -f /usr/pgsql-16/share/extension/postgis.control && \
    ldd /usr/pgsql-16/lib/pg_documentdb.so && \
    echo "DocumentDB extension verified OK"

# Restore Crunchy runtime user (UID 26 = postgres).
USER 26
