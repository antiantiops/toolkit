FROM ghcr.io/ferretdb/postgres-documentdb:17-0.107.0-ferretdb-2.7.0

# PGO runtime contract missing from upstream FerretDB image.
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      libnss-wrapper \
      patroni \
      pgbackrest \
      postgresql-17-pgaudit \
      python3-kubernetes \
 && mkdir -p /usr/lib64 \
 && ln -sf "$(find /usr/lib -name libnss_wrapper.so -type f -print -quit)" /usr/lib64/libnss_wrapper.so \
 && rm -f /etc/pgbackrest.conf \
 && test -x /usr/bin/patroni \
 && test -x /usr/bin/pgbackrest \
 && test -f /usr/lib64/libnss_wrapper.so \
 && test -f /usr/lib/postgresql/17/lib/pgaudit.so \
 && rm -rf /var/lib/apt/lists/*

USER 999
