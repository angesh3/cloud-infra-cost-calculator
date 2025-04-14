FROM node:18-alpine

WORKDIR /app

# Add a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files
COPY package*.json ./

# Install dependencies and set permissions
RUN npm install && \
    chown -R appuser:appgroup /app

# Copy source code
COPY . .

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000
ENV WDS_SOCKET_PORT=0
ENV CI=false
ENV PORT=3000

# Set permissions for the app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3000

# Build the application
RUN npm run build

# Start the development server with hot-reloading
CMD ["npm", "start"] 