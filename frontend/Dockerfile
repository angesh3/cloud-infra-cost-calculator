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
    npm install ajv@^8.0.0 ajv-keywords@^5.0.0 --legacy-peer-deps --no-audit --no-package-lock && \
    npm cache clean --force && \
    rm -rf /root/.npm/* /tmp/*

# Copy source and build
COPY . .

# Build with verification
RUN npm run build || (echo "Build failed" && exit 1) && \
    if [ ! -d "build" ]; then echo "Build directory not created" && exit 1; fi && \
    ls -la build && \
    rm -rf node_modules package*.json && \
    find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true && \
    ls -la build

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

# Create directory first and verify copy
RUN mkdir -p /usr/share/nginx/html
COPY --from=builder /app/build/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify files were copied
RUN ls -la /usr/share/nginx/html/

EXPOSE 3000 3443

CMD ["nginx", "-g", "daemon off;"] 