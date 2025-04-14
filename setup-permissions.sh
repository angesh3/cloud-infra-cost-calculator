#!/bin/bash

# Create .docker-cache directory if it doesn't exist
mkdir -p frontend/.docker-cache

# Set permissions for the frontend directory
sudo chown -R $USER:$USER frontend/
sudo chmod -R 755 frontend/

# Set permissions for the backend directory
sudo chown -R $USER:$USER backend/
sudo chmod -R 755 backend/

# Export current user's UID and GID
export UID=$(id -u)
export GID=$(id -g)

echo "Permissions have been set up correctly."
echo "Now you can run: docker-compose up --build" 