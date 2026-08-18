FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV DEV_USER=devops

RUN apt-get update && apt-get install -y --no-install-recommends \
    openvpn \
    openssh-server \
    ca-certificates \
    curl \
    wget \
    git \
    jq \
    vim \
    nano \
    less \
    sudo \
    iproute2 \
    iputils-ping \
    dnsutils \
    netcat-openbsd \
    procps \
    && rm -rf /var/lib/apt/lists/*

RUN ARCH=$(dpkg --print-architecture) \
    && curl -sSL -o /usr/local/bin/argocd "https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-${ARCH}" \
    && chmod +x /usr/local/bin/argocd

RUN useradd -m -s /bin/bash "${DEV_USER}" \
    && echo "${DEV_USER} ALL=(ALL) NOPASSWD:ALL" \
      > /etc/sudoers.d/${DEV_USER} \
    && chmod 0440 /etc/sudoers.d/${DEV_USER} \
    && mkdir -p /run/sshd /etc/openvpn \
    && mkdir -p /home/${DEV_USER}/.ssh \
    && chown -R ${DEV_USER}:${DEV_USER} /home/${DEV_USER}/.ssh \
    && chmod 700 /home/${DEV_USER}/.ssh

RUN sed -ri \
    -e 's/^#?PermitRootLogin\s+.*/PermitRootLogin no/' \
    -e 's/^#?PasswordAuthentication\s+.*/PasswordAuthentication no/' \
    -e 's/^#?PubkeyAuthentication\s+.*/PubkeyAuthentication yes/' \
    -e 's@^#?AuthorizedKeysFile\s+.*@AuthorizedKeysFile .ssh/authorized_keys@' \
    /etc/ssh/sshd_config

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 22

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
