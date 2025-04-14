#!/bin/bash

# Create SSL directory
mkdir -p ssl

# Generate SSL certificate and key
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/private.key \
    -out ssl/certificate.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set proper permissions
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt

echo "SSL certificates generated successfully!"
echo "You can now run: docker-compose up --build" 