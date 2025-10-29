# Use a Go base image that satisfies the dependency requirement
FROM golang:1.24-alpine

# Set the working directory
WORKDIR /app

# Use 'go install' with a wildcard to correctly find and install the main command.
# The '/...' tells Go to look inside the module for any runnable commands.
RUN go install github.com/GoogleCloudPlatform/kubectl-ai/...@v0.0.26

# The final command to run when the container starts.
ENTRYPOINT ["/go/bin/kubectl-ai"]
