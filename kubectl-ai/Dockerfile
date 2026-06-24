# --- Builder Stage ---
FROM golang:1.26-alpine as builder

# Install git (needed to clone the repository)
RUN apk add --no-cache git python3

# Set the working directory
WORKDIR /app

# Clone the repository and checkout the specific version tag
RUN git clone https://github.com/GoogleCloudPlatform/kubectl-ai.git . && \
    git checkout v0.0.31 && \
    go mod edit -replace=google.golang.org/grpc=google.golang.org/grpc@v1.79.3 && \
    go mod edit -replace=github.com/ollama/ollama=github.com/ollama/ollama@v0.30.10 && \
    python3 -c 'from pathlib import Path; p=Path("gollm/ollama.go"); s=p.read_text(); s=s.replace("Arguments: toolCall.Function.Arguments,", "Arguments: toolCall.Function.Arguments.ToMap(),"); s=s.replace("Parameters: struct {\n\t\t\t\tType       string   `json:\"type\"`\n\t\t\t\tRequired   []string `json:\"required\"`\n\t\t\t\tProperties map[string]struct {\n\t\t\t\t\tType        string   `json:\"type\"`\n\t\t\t\t\tDescription string   `json:\"description\"`\n\t\t\t\t\tEnum        []string `json:\"enum,omitempty\"`\n\t\t\t\t} `json:\"properties\"`\n\t\t\t}{\n\t\t\t\tType:     \"object\",\n\t\t\t\tRequired: fnDef.Parameters.Required,\n\t\t\t\tProperties: map[string]struct {\n\t\t\t\t\tType        string   `json:\"type\"`\n\t\t\t\t\tDescription string   `json:\"description\"`\n\t\t\t\t\tEnum        []string `json:\"enum,omitempty\"`\n\t\t\t\t}{},\n\t\t\t},", "Parameters: api.ToolFunctionParameters{\n\t\t\t\tType:       \"object\",\n\t\t\t\tRequired:   fnDef.Parameters.Required,\n\t\t\t\tProperties: api.NewToolPropertiesMap(),\n\t\t\t},"); s=s.replace("tool.Function.Parameters.Properties[paramName] = struct {\n\t\t\tType        string   `json:\"type\"`\n\t\t\tDescription string   `json:\"description\"`\n\t\t\tEnum        []string `json:\"enum,omitempty\"`\n\t\t}{\n\t\t\tType:        string(param.Type),\n\t\t\tDescription: param.Description,\n\t\t}", "tool.Function.Parameters.Properties.Set(paramName, api.ToolProperty{\n\t\t\tType:        api.PropertyType{string(param.Type)},\n\t\t\tDescription: param.Description,\n\t\t})"); p.write_text(s)' && \
    go mod tidy && \
    go work use .

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

# Copy the compiled binary into PATH and make it executable
COPY --from=builder /app/kubectl-ai /usr/local/bin/kubectl-ai
RUN chmod +x /usr/local/bin/kubectl-ai

# Set the entrypoint
ENTRYPOINT ["kubectl-ai"]
