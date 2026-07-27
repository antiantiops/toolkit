# syntax=docker/dockerfile:1.7
# DocumentDB Extension Image (initContainer)
# Contains pre-compiled DocumentDB extension + dependencies.
# Used as initContainer to inject extensions into vanilla Crunchy PG container.

ARG DOCUMENTDB_REF=v0.107-0

# ── Stage 1: build on Rocky 9 ──
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
    dnf -y install postgresql16 postgresql16-devel postgresql16-server && \
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

# Collect extension artifacts + shared lib dependencies into /extensions
COPY copy-deps.sh /tmp/copy-deps.sh
RUN bash /tmp/copy-deps.sh && \
    mv /staging /extensions

# ── Stage 2: minimal image with only extension artifacts ──
FROM registry.access.redhat.com/ubi9-micro:latest

COPY --from=builder /extensions/ /extensions/
COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
