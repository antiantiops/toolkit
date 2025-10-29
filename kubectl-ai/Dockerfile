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

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Set the working directory
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/kubectl-ai .

# Make it executable
RUN chmod +x kubectl-ai

# Set the entrypoint
ENTRYPOINT ["./kubectl-ai"]
