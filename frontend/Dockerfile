FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000
ENV WDS_SOCKET_PORT=0
ENV CI=false
ENV PORT=3000

# Build the application
RUN npm run build

# Install serve to run the built application
RUN npm install -g serve

EXPOSE 3000

# Start the application using serve instead of development server
CMD ["serve", "-s", "build", "-l", "3000"] 