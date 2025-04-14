#!/bin/bash

# Update the system
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start Docker service
sudo service docker start
sudo systemctl enable docker

# Add ec2-user to docker group
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone the repository
git clone https://github.com/angesh3/cloud-infra-cost-calculator.git
cd cloud-infra-cost-calculator
git checkout v1-3

# Start the application
docker-compose up -d 