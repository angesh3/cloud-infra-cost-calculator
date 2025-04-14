FROM node:18-alpine

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

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000
ENV WDS_SOCKET_PORT=0
ENV CI=false
ENV PORT=3000

# Build with optimization flags
RUN npm run build

# Use nginx to serve the static files
FROM nginx:alpine

# Copy the build output
COPY --from=0 /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 