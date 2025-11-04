# --- Builder Stage ---
FROM golang:1.24-alpine as builder

# Install git (needed to clone the repository)
RUN apk add --no-cache git

# Set the working directory
WORKDIR /app

# Clone the repository and checkout the specific version tag
RUN git clone https://github.com/GoogleCloudPlatform/kubectl-ai.git . && \
    git checkout v0.0.26

# Download Go module dependencies
RUN go mod download

# Build the binary from the cmd directory
# This targets the main.go file in the cmd folder
RUN CGO_ENABLED=0 go build -o kubectl-ai ./cmd

# --- Final Stage ---
FROM alpine:latest

# Install runtime deps: certs for HTTPS, bash (kubectl-ai shells out to /bin/bash), and curl
RUN apk --no-cache add ca-certificates bash curl

# Install kubectl (latest stable)
RUN KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt) \
    && curl -L -o /usr/local/bin/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
    && chmod +x /usr/local/bin/kubectl

# Set the working directory
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/kubectl-ai .

# Make it executable
RUN chmod +x kubectl-ai

# Set the entrypoint
ENTRYPOINT ["./kubectl-ai"]
