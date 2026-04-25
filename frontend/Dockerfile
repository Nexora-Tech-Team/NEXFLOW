FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency dulu
COPY package*.json ./

# Install dengan permission fix
RUN npm install --unsafe-perm

# Copy semua source
COPY . .

# Fix permission binary (tsc, vite, dll)
RUN chmod -R 755 node_modules/.bin

# Env build
ARG VITE_API_URL=https://api-nexflow.nexoratech.co
ENV VITE_API_URL=$VITE_API_URL

# Build frontend
RUN npm run build

# =========================
# NGINX STAGE
# =========================
FROM nginx:alpine

# Copy hasil build
COPY --from=builder /app/dist /usr/share/nginx/html

# Config nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
