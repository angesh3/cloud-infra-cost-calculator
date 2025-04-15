#!/bin/bash

# Check if we're running on EC2
if curl -s http://169.254.169.254/latest/meta-data/public-ipv4 > /dev/null; then
    # We're on EC2, get the public IP
    export PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
else
    # We're running locally
    export PUBLIC_IP=localhost
fi

echo "Starting application with API_URL=http://$PUBLIC_IP:8000"

# Stop any running containers
docker-compose down

# Start the application
docker-compose up --build -d 