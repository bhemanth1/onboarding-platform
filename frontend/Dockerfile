# Build:  podman build -t aegis-fe --build-arg VITE_API_URL=http://localhost:5001/dana-aegis .
# Run:    podman run -d --name aegis-fe -p 5000:5000 aegis-fe
#         (-p host:container is required; without it, localhost:5000 will not work.)
#
# --- Build: install deps and produce static dist/ ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first (better layer cache)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at build time only
ARG VITE_API_URL=http://localhost:5001/dana-aegis
ENV VITE_API_URL=$VITE_API_URL

# Path where the SPA is mounted (ingress prefix). Must match trailing slash form, e.g. /dana-aegis-fe/
ARG BASE_PATH=/dana-aegis-fe/
ENV BASE_PATH=$BASE_PATH

RUN npm run build

# --- Run: static files only (small image, no Node in production) ---
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]
