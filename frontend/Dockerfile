FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies required for node-gyp and clean up in the same layer
RUN apk add --no-cache python3 make g++ && \
    rm -rf /var/cache/apk/*

# Copy only package files first
COPY package*.json ./

# Install dependencies with cleanup in a single layer
RUN npm cache clean --force && \
    npm install --legacy-peer-deps --no-audit --production=false && \
    npm install recharts@2.7.2 --legacy-peer-deps --no-audit && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy source code
COPY . .

# Build with optimization flags and cleanup
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_ENV=production
RUN npm run build && \
    npm prune --production && \
    rm -rf node_modules && \
    rm -rf /tmp/*

# Use nginx to serve the static files
FROM nginx:alpine

# Install OpenSSL and clean up in the same layer
RUN apk add --no-cache openssl && \
    rm -rf /var/cache/apk/*

# Create SSL directory and generate certificate in a single layer
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/private.key \
    -out /etc/nginx/ssl/certificate.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy the build output and nginx configuration
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000 3443

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 