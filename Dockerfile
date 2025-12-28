# Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY web .
RUN pnpm build

# Build backend
FROM golang:alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy frontend build artifacts to the embedded location
COPY --from=frontend /app/web/dist ./server/router/frontend/dist
# Build the binary
RUN go build -o memos ./cmd/memos/main.go

# Runtime
FROM alpine:latest
WORKDIR /usr/local/memos
COPY --from=backend /app/memos /usr/local/memos/
# Create default data directory
RUN mkdir -p /var/opt/memos

# Expose default port
EXPOSE 5230

# run
ENTRYPOINT ["./memos"]
