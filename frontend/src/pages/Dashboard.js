import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Sample data - in a real app, this would come from an API
const sampleData = {
  monthlyCosts: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'AWS',
        data: [1200, 1900, 1500, 1800, 2100, 2300],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Azure',
        data: [1100, 1800, 1400, 1700, 2000, 2200],
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
      {
        label: 'GCP',
        data: [1000, 1700, 1300, 1600, 1900, 2100],
        borderColor: 'rgb(53, 162, 235)',
        tension: 0.1,
      },
    ],
  },
  costBreakdown: {
    labels: ['Network', 'Compute', 'Storage', 'Services'],
    datasets: [
      {
        label: 'Cost Distribution',
        data: [30, 40, 20, 10],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
      },
    ],
  },
};

function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cloud Infrastructure Cost Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Monthly Cost
              </Typography>
              <Typography variant="h4">$2,300</Typography>
              <Typography color="textSecondary">
                +15% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Resources
              </Typography>
              <Typography variant="h4">24</Typography>
              <Typography color="textSecondary">
                Across 3 cloud providers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cost per Resource
              </Typography>
              <Typography variant="h4">$95.83</Typography>
              <Typography color="textSecondary">
                Average monthly cost
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Cost Trends
            </Typography>
            <Line
              data={sampleData.monthlyCosts}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Cloud Provider Cost Comparison',
                  },
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cost Breakdown
            </Typography>
            <Bar
              data={sampleData.costBreakdown}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Resource Cost Distribution',
                  },
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recommendations
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" paragraph>
                • Consider migrating non-critical workloads to GCP for potential 10% cost savings
              </Typography>
              <Typography variant="body1" paragraph>
                • Optimize storage usage by implementing lifecycle policies
              </Typography>
              <Typography variant="body1" paragraph>
                • Review and adjust auto-scaling configurations to reduce compute costs
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard; 