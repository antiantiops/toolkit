FROM ghcr.io/ferretdb/postgres-documentdb:17-0.107.0-ferretdb-2.7.0

# PGO requires Patroni and nss_wrapper from its PostgreSQL image contract.
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      libnss-wrapper \
      patroni \
      python3-kubernetes \
 && rm -rf /var/lib/apt/lists/*

# PGO expects the RHEL path even when the base image is Debian.
RUN mkdir -p /usr/lib64 \
 && ln -s /usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)/libnss_wrapper.so /usr/lib64/libnss_wrapper.so

USER 999
