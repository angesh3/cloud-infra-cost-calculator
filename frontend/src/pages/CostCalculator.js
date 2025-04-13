import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const initialFormState = {
  deployment: {
    size: 'Small',
    data_throughput: 100,
    peak_load: 10,
    transfer_frequency: 24,
  },
  consumer: {
    pattern: 'pubsub',
    num_consumers: 100,
    data_distribution_volume: 1000,
    request_count: 10000,
    concurrent_users: 50,
  },
  infrastructure: {
    environment: 'prod',
    region: 'us-east-1',
    compute_resources: {
      app_servers: { size: 'medium', count: 2 },
      db_servers: { size: 'large', count: 1 },
    },
    storage_requirements: {
      block_storage: { type: 'standard', size: 100 },
      object_storage: { type: 'standard', size: 500 },
    },
    additional_services: ['monitoring', 'logging'],
  },
  cloud_provider: 'aws',
};

function CostCalculator() {
  const [formData, setFormData] = useState(initialFormState);
  const [costResults, setCostResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/calculate-cost', formData);
      setCostResults(response.data);
    } catch (error) {
      console.error('Error calculating costs:', error);
      // TODO: Add error handling UI
    }
    setLoading(false);
  };

  const chartData = costResults ? {
    labels: ['Network', 'Consumer', 'Infrastructure'],
    datasets: [
      {
        label: 'Cost Breakdown',
        data: [
          costResults.network_cost,
          costResults.consumer_cost,
          costResults.infrastructure_cost,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cloud Infrastructure Cost Calculator
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom>
                Deployment Configuration
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Deployment Size</InputLabel>
                <Select
                  value={formData.deployment.size}
                  onChange={(e) => handleInputChange('deployment', 'size', e.target.value)}
                >
                  <MenuItem value="Small">Small</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Large">Large</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Data Throughput (GB/month)"
                type="number"
                value={formData.deployment.data_throughput}
                onChange={(e) => handleInputChange('deployment', 'data_throughput', Number(e.target.value))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Peak Load (GB/hour)"
                type="number"
                value={formData.deployment.peak_load}
                onChange={(e) => handleInputChange('deployment', 'peak_load', Number(e.target.value))}
                sx={{ mb: 2 }}
              />

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Consumer Configuration
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Pattern</InputLabel>
                <Select
                  value={formData.consumer.pattern}
                  onChange={(e) => handleInputChange('consumer', 'pattern', e.target.value)}
                >
                  <MenuItem value="pubsub">Publish-Subscribe</MenuItem>
                  <MenuItem value="reverse_proxy">Reverse API Proxy</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Number of Consumers"
                type="number"
                value={formData.consumer.num_consumers}
                onChange={(e) => handleInputChange('consumer', 'num_consumers', Number(e.target.value))}
                sx={{ mb: 2 }}
              />

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Infrastructure Configuration
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Cloud Provider</InputLabel>
                <Select
                  value={formData.cloud_provider}
                  onChange={(e) => handleInputChange('cloud_provider', '', e.target.value)}
                >
                  <MenuItem value="aws">AWS</MenuItem>
                  <MenuItem value="azure">Azure</MenuItem>
                  <MenuItem value="gcp">Google Cloud</MenuItem>
                </Select>
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
              >
                {loading ? 'Calculating...' : 'Calculate Cost'}
              </Button>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          {costResults && (
            <Box>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cost Summary
                  </Typography>
                  <Typography variant="h4" color="primary">
                    ${costResults.total_cost.toFixed(2)}/month
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography>Network Cost: ${costResults.network_cost.toFixed(2)}</Typography>
                    <Typography>Consumer Cost: ${costResults.consumer_cost.toFixed(2)}</Typography>
                    <Typography>Infrastructure Cost: ${costResults.infrastructure_cost.toFixed(2)}</Typography>
                  </Box>
                </CardContent>
              </Card>

              {chartData && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Cost Breakdown
                  </Typography>
                  <Line data={chartData} />
                </Paper>
              )}
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default CostCalculator; 