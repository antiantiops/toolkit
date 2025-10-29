# Use a Go base image to get the necessary build tools
FROM golang:1.22-alpine

# Set the working directory
WORKDIR /app

# Use 'go install' to fetch, compile, and install a specific version of kubectl-ai.
# The binary will be placed in /go/bin/kubectl-ai
RUN go install github.com/GoogleCloudPlatform/kubectl-ai@v0.0.26

# The final command to run when the container starts.
ENTRYPOINT ["/go/bin/kubectl-ai"]