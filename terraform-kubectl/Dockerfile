# Use the Debian image as the base
FROM debian:bookworm-slim

# Maintainer and author label
LABEL maintainer="Nimtechnology"

# Set versions for tools to install: https://releases.hashicorp.com/terraform/
ENV TERRAFORM_VERSION=1.11.3
##How to check the latest version of kubectl: https://dl.k8s.io/release/stable.txt
ENV KUBECTL_VERSION=v1.32.3
# # Set Docker version as an environment variable
# ENV DOCKER_VERSION=5:23.0.3~3-0~debian

# Azure CLI deb package version (must match repo, e.g. 2.64.0-1~bookworm)
ENV AZURE_CLI_VERSION=2.64.0-1~bookworm

# Install necessary utilities and tools
RUN apt-get update && apt-get install -y \
    gpg \
    curl \
    unzip \
    git \
    ca-certificates \
    --no-install-recommends && \
    # Install Terraform
    curl -LO https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    mv terraform /usr/local/bin/ && \
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    # Install kubectl
    curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install helm
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh

# Install eksctl: https://github.com/eksctl-io/eksctl/releases
ENV EKSCTL_VERSION=v0.207.0
ENV ARCH=amd64
RUN PLATFORM=$(uname -s)_$ARCH && \
    curl -sLO "https://github.com/eksctl-io/eksctl/releases/download/$EKSCTL_VERSION/eksctl_$PLATFORM.tar.gz" && \
    curl -sL "https://github.com/eksctl-io/eksctl/releases/download/$EKSCTL_VERSION/eksctl_checksums.txt" | grep $PLATFORM | sha256sum --check && \
    tar -xzf eksctl_$PLATFORM.tar.gz -C /tmp && rm eksctl_$PLATFORM.tar.gz && \
    mv /tmp/eksctl /usr/local/bin

# Install aws-cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

# Install Docker CLI with a dynamically determined Debian codename
RUN apt-get update
RUN install -m 0755 -d /etc/apt/keyrings
RUN curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
RUN chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
RUN   echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN apt-get update
RUN apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Azure CLI
RUN mkdir -p /etc/apt/keyrings; \
    curl -sL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | tee /etc/apt/keyrings/microsoft-archive-keyring.gpg > /dev/null; \
    echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/repos/azure-cli/ $(. /etc/os-release && echo \"$VERSION_CODENAME\") main" > /etc/apt/sources.list.d/azure-cli.list; \
    apt-get update; \
    apt-get install -y azure-cli=${AZURE_CLI_VERSION}; \
    rm -rf /var/lib/apt/lists/*

# Cleanup
RUN apt-get remove --purge -y curl unzip && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Confirm the tools were installed
RUN terraform --version
RUN kubectl version --client
RUN git --version
RUN helm version
RUN aws --version
RUN eksctl version
RUN az version
RUN docker --version  # Check Docker CLI installation

# Command to keep the container running
CMD ["/bin/bash"]
