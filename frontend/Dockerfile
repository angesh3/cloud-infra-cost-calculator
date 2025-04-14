FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies required for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Set memory limits and install dependencies
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_ENV=production
RUN npm ci --only=production --legacy-peer-deps

# Copy source code
COPY . .

# Build with optimization flags
RUN npm run build

# Use nginx to serve the static files
FROM nginx:alpine

# Install OpenSSL
RUN apk add --no-cache openssl

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/private.key \
    -out /etc/nginx/ssl/certificate.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy the build output
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000 3443

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 