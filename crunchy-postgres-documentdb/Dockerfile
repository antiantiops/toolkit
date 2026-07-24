# syntax=docker/dockerfile:1.7
# Crunchy PostgreSQL 16 + DocumentDB extension.
# Multi-stage: build on Rocky 9 (full dnf), copy entire extension dirs to Crunchy.

ARG CRUNCHY_IMAGE=registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi9-16.14-2621
ARG DOCUMENTDB_REF=v0.107-0

# ── Stage 1: build on Rocky 9 (has dnf, gcc, full toolchain) ──
FROM rockylinux:9 AS builder
ARG DOCUMENTDB_REF
ARG TARGETARCH
ENV PG_MAJOR=16 \
    PG_CONFIG=/usr/pgsql-16/bin/pg_config \
    PATH=/usr/pgsql-16/bin:${PATH}

RUN dnf -y install dnf-plugins-core epel-release && \
    dnf config-manager --set-enabled crb && \
    dnf -y swap curl-minimal curl && \
    dnf -y install git gcc gcc-c++ make cmake which tar findutils redhat-rpm-config \
      libicu-devel krb5-devel openssl-devel cyrus-sasl-devel snappy-devel \
      zlib-devel libcurl-devel libuuid-devel lz4-devel bzip2-devel \
      llvm-toolset clang-devel llvm-devel perl-IPC-Run && \
    arch="$(case "${TARGETARCH}" in arm64|arm64v8) echo aarch64 ;; *) echo x86_64 ;; esac)" && \
    dnf -y --disablerepo='*' install "https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-${arch}/pgdg-redhat-repo-latest.noarch.rpm" && \
    dnf -qy module disable postgresql && \
    dnf -y install postgresql16 postgresql16-devel postgresql16-server \
      pgvector_16 pg_cron_16 postgis36_16 rum_16 && \
    mkdir -p /usr/lib64/llvm20 /usr/lib64/llvm21 && \
    ln -sf /usr/bin /usr/lib64/llvm20/bin && \
    ln -sf /usr/bin /usr/lib64/llvm21/bin && \
    dnf clean all

WORKDIR /src
RUN git clone --depth 1 --branch "${DOCUMENTDB_REF}" https://github.com/documentdb/documentdb.git .

RUN cp -a /src/scripts /tmp/documentdb-setup && \
    export INSTALL_DEPENDENCIES_ROOT=/tmp/documentdb-setup && \
    MAKE_PROGRAM=cmake /tmp/documentdb-setup/install_setup_libbson.sh && \
    /tmp/documentdb-setup/install_setup_pcre2.sh && \
    /tmp/documentdb-setup/install_setup_intel_decimal_math_lib.sh && \
    make PG_CONFIG="${PG_CONFIG}" PG_CFLAGS='-std=gnu99 -Wall -Wno-error' install-no-distributed && \
    test -f /usr/pgsql-16/share/extension/documentdb.control && \
    test -f /usr/pgsql-16/lib/pg_documentdb.so

# Collect everything we need into /staging.
# Copy whole extension dirs — no cherry-picking individual .so files.
COPY copy-deps.sh /tmp/copy-deps.sh
RUN bash /tmp/copy-deps.sh

# ── Stage 2: slim Crunchy runtime ──
FROM ${CRUNCHY_IMAGE}
USER root
COPY --from=builder /staging/ /
RUN ldconfig && \
    test -f /usr/pgsql-16/share/extension/documentdb.control && \
    test -f /usr/pgsql-16/share/extension/postgis.control && \
    test -f /usr/pgsql-16/lib/pg_documentdb.so && \
    ldd /usr/pgsql-16/lib/pg_documentdb.so && \
    echo "DocumentDB + PostGIS verified OK"
USER 26
