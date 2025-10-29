# Use a newer Go base image that satisfies the dependency requirement
FROM golang:1.24-alpine

# Set the working directory
WORKDIR /app

# Use 'go install' to fetch, compile, and install a specific version of kubectl-ai.
# This will now succeed because the Go version is correct.
RUN go install github.com/GoogleCloudPlatform/kubectl-ai@v0.0.26

# The final command to run when the container starts.
ENTRYPOINT ["/go/bin/kubectl-ai"]