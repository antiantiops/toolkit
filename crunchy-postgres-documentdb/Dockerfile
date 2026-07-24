# syntax=docker/dockerfile:1.7
# EXPERIMENTAL POC: Crunchy PostgreSQL 16 plus the DocumentDB extension.
# Retains the Crunchy runtime image and its PGO/Patroni/pgBackRest tooling.

ARG CRUNCHY_IMAGE=registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi9-16.14-2621
ARG DOCUMENTDB_REF=v0.107-0

FROM rockylinux:9 AS documentdb-builder
ARG DOCUMENTDB_REF
ARG TARGETARCH
ENV PG_MAJOR=16 \
    PG_CONFIG=/usr/pgsql-16/bin/pg_config \
    PATH=/usr/pgsql-16/bin:${PATH}

# DocumentDB's upstream EL9 PG16 packages depend on pgvector, pg_cron,
# PostGIS and RUM. The extension is built with the same /usr/pgsql-16
# PGXS layout used by the Crunchy PG16 runtime image.
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

# Match DocumentDB upstream's EL9 packaging dependency build. This builds
# libbson, PCRE2 and Intel decimal math, then only the non-distributed
# DocumentDB PostgreSQL extension.
# Use absolute script paths: the upstream setup scripts change their working
# directory internally, so relative ./scripts paths are not reliable here.
RUN cp -a /src/scripts /tmp/documentdb-setup && \
    export INSTALL_DEPENDENCIES_ROOT=/tmp/documentdb-setup && \
    MAKE_PROGRAM=cmake /tmp/documentdb-setup/install_setup_libbson.sh && \
    /tmp/documentdb-setup/install_setup_pcre2.sh && \
    /tmp/documentdb-setup/install_setup_intel_decimal_math_lib.sh && \
    make PG_CONFIG="${PG_CONFIG}" PG_CFLAGS='-std=gnu99 -Wall -Wno-error' install-no-distributed && \
    test -f /usr/pgsql-16/share/extension/documentdb.control && \
    test -f /usr/pgsql-16/lib/pg_documentdb.so

# Stage DocumentDB plus its PostgreSQL extension dependencies. PGDG's PostGIS
# RPM puts its shared objects, controls and SQL migration files under the PG16
# prefix; without these, CREATE EXTENSION documentdb fails at postgis.control.
# Never copy PostgreSQL binaries, pg_ctl, Patroni or PGO tooling.
RUN mkdir -p /opt/documentdb/usr/pgsql-16/lib \
      /opt/documentdb/usr/pgsql-16/share/extension \
      /opt/documentdb/usr/lib64 /opt/documentdb/usr/lib && \
    cp -a /usr/pgsql-16/lib/pg_documentdb*.so \
          /usr/pgsql-16/lib/postgis*.so \
          /usr/pgsql-16/lib/rtpostgis*.so \
          /opt/documentdb/usr/pgsql-16/lib/ && \
    cp -a /usr/pgsql-16/share/extension/documentdb* \
          /usr/pgsql-16/share/extension/postgis* \
          /opt/documentdb/usr/pgsql-16/share/extension/ && \
    cp -a /usr/lib64/libbson-1.0.so* \
          /usr/lib64/liblwgeom*.so* \
          /usr/lib64/libgeos*.so* \
          /usr/lib64/libproj*.so* \
          /usr/lib64/libjson-c*.so* \
          /usr/lib64/libxml2.so* \
          /opt/documentdb/usr/lib64/ && \
    cp -a /usr/lib/intelmathlib /opt/documentdb/usr/lib/ && \
    ldd /usr/pgsql-16/lib/pg_documentdb.so && \
    ldd /usr/pgsql-16/lib/postgis-3.so

FROM ${CRUNCHY_IMAGE}
USER root
COPY --from=documentdb-builder /opt/documentdb/ /

RUN test -x /usr/pgsql-16/bin/postgres && \
    test -f /usr/pgsql-16/share/extension/documentdb.control && \
    test -f /usr/pgsql-16/lib/pg_documentdb.so

# Crunchy PostgreSQL containers run as the postgres account (UID 26). PGO's
# startup init validates ownership of the existing data directory, so preserving
# this image-level user is required; using UID 2 makes that init fail on an
# existing PVC.
USER 26
