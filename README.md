# Cloud Infrastructure Cost Calculator

A comprehensive tool for calculating cloud infrastructure costs for on-premise to cloud integration scenarios. This application helps organizations estimate and optimize their cloud spending across multiple providers.

## Features

- Network Data Load Calculation
- Consumer Interaction Cost Analysis
- Cloud Hosted Infrastructure Cost Estimation
- Multi-Cloud Provider Support (AWS, Azure, Google Cloud)
- Interactive Cost Visualization
- Real-time Cost Updates
- Comparative Analysis Across Providers
- Container Management Cost Analysis
- Region-specific Cost Adjustments

## Project Structure

```
.
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   ├── services/     # API services
│   │   └── styles/       # CSS and styling files
│   ├── Dockerfile        # Frontend container configuration
│   └── package.json      # Node.js dependencies
│
├── backend/               # FastAPI backend application
│   ├── app/              # Main application code
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   ├── Dockerfile        # Backend container configuration
│   └── requirements.txt  # Python dependencies
│
├── docker-compose.yml    # Docker services configuration
└── README.md
```

## Prerequisites

- Docker Desktop (latest version)
- Docker Compose

## Quick Start with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/angesh3/cloud-infra-cost-calculator.git
   cd cloud-infra-cost-calculator
   ```

2. Start the application using Docker Compose:
   ```bash
   docker-compose up --build
   ```

   This command will:
   - Build the frontend and backend Docker images
   - Start the containers
   - Set up the network between services
   - Configure health checks

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API docs: http://localhost:8000/docs

4. To stop the application:
   ```bash
   docker-compose down
   ```

## Manual Setup (Development)

### Backend Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Run the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run the development server:
   ```bash
   npm start
   ```

## Usage Guide

1. Access the application at `http://localhost:3000`
2. Use the Calculator tab to:
   - Select your deployment type (Small, Medium, Large)
   - Configure requirements:
     - Network data load
     - Consumer interaction patterns
     - Cloud infrastructure needs
     - Container management options
     - Additional services
3. View the Report tab for:
   - Detailed cost breakdowns
   - Cost comparisons across providers
   - Region-specific adjustments
   - Monthly and yearly projections

## Troubleshooting

### Docker Issues
- If ports 3000 or 8000 are in use:
  ```bash
  # Find and kill processes using the ports
  lsof -ti:3000,8000 | xargs kill -9
  ```
- If containers aren't starting properly:
  ```bash
  # Clean up Docker system and rebuild
  docker-compose down
  docker system prune -f
  docker-compose up --build --force-recreate
  ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
