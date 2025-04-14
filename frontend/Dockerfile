FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and recharts explicitly
RUN npm install && npm install recharts

# Copy source code
COPY . .

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000
ENV WDS_SOCKET_PORT=0
ENV CI=false
ENV PORT=3000

EXPOSE 3000

# Build the application
RUN npm run build

# Start the development server with hot-reloading
CMD ["npm", "start"] 