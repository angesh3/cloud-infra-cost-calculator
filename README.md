# Cloud Infrastructure Cost Calculator

A comprehensive tool for calculating cloud infrastructure costs for on-premise to cloud integration scenarios.

## Features

- Network Data Load Calculation
- Consumer Interaction Cost Analysis
- Cloud Hosted Infrastructure Cost Estimation
- Multi-Cloud Provider Support (AWS, Azure, Google Cloud)
- Interactive Cost Visualization
- Real-time Cost Updates
- Comparative Analysis Across Providers

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
│   └── package.json
│
├── backend/               # FastAPI backend application
│   ├── app/              # Main application code
│   ├── models/           # Data models
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
│
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Docker (for containerization)

## Getting Started

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
   uvicorn app.main:app --reload
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

## Usage

1. Access the application at `http://localhost:3000`
2. Select your deployment type (Small, Medium, Large)
3. Configure your requirements:
   - Network data load
   - Consumer interaction patterns
   - Cloud infrastructure needs
   - Additional services
4. View detailed cost breakdowns and comparisons

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
