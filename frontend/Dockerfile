FROM node:18-alpine as builder

WORKDIR /app

# Install only essential dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package*.json ./

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Install dependencies in a single layer with cleanup
RUN npm install --legacy-peer-deps --no-audit --no-package-lock && \
    npm install recharts@2.7.2 --legacy-peer-deps --no-audit --no-package-lock && \
    npm cache clean --force && \
    rm -rf /root/.npm/* /tmp/*

# Copy source and build
COPY . .
RUN npm run build && \
    rm -rf node_modules package*.json && \
    find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true

# Use minimal nginx
FROM nginx:alpine-slim

# SSL setup in a single layer
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/private.key \
    -out /etc/nginx/ssl/certificate.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" && \
    apk del openssl && \
    rm -rf /var/cache/apk/* /tmp/*

# Copy only built files
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000 3443

CMD ["nginx", "-g", "daemon off;"] 