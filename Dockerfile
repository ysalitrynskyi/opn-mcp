# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: skip the `prepare` (tsc) hook until sources are copied.
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/dist ./dist

# The server boots and answers MCP introspection (initialize + tools/list)
# WITHOUT any env. OPN_API_KEY / OPN_BASE_URL are read at tool-call time.
ENTRYPOINT ["node", "dist/index.js"]
