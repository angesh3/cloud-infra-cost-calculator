# EC2 Deployment Guide

## Minimum Requirements
- t2.micro instance (Free tier eligible)
- 1 vCPU
- 1 GB RAM
- 8 GB Storage
- Amazon Linux 2023 AMI

## Deployment Options

### Option 1: Using CloudFormation Template

1. Log in to AWS Console and go to CloudFormation
2. Click "Create stack" and upload `ec2-template.yaml`
3. Enter parameters:
   - Stack name (e.g., cost-calculator)
   - KeyName (select your existing EC2 key pair)
4. Review and create stack
5. Wait for stack creation to complete (~5-10 minutes)
6. Access the application using the URLs from the Outputs tab:
   - Frontend: http://<EC2-Public-DNS>:3000
   - Backend: http://<EC2-Public-DNS>:8000

### Option 2: Manual EC2 Setup

1. Launch EC2 instance:
   - Choose Amazon Linux 2023 AMI
   - Select t2.micro instance type
   - Configure security group with these ports:
     - 22 (SSH)
     - 3000 (Frontend)
     - 8000 (Backend)
   - Add 8GB storage

2. SSH into your instance:
   ```bash
   chmod 400 your-key.pem
   ssh -i your-key.pem ec2-user@<EC2-Public-DNS>
   ```

3. Run the setup script:
   ```bash
   wget https://raw.githubusercontent.com/angesh3/cloud-infra-cost-calculator/v1-3/ec2-setup.sh
   chmod +x ec2-setup.sh
   ./ec2-setup.sh
   ```

4. Access the application:
   - Frontend: http://<EC2-Public-DNS>:3000
   - Backend: http://<EC2-Public-DNS>:8000

## Troubleshooting

1. Check Docker service:
   ```bash
   sudo systemctl status docker
   ```

2. View application logs:
   ```bash
   cd cloud-infra-cost-calculator
   docker-compose logs
   ```

3. Restart containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. Check available memory:
   ```bash
   free -m
   ```

5. Check disk space:
   ```bash
   df -h
   ```

## Security Notes

- The security group is configured to allow access from any IP (0.0.0.0/0)
- For production, restrict access to specific IP ranges
- Consider using HTTPS with SSL/TLS certificates
- Regularly update the system and Docker images 