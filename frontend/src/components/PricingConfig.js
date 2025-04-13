import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Snackbar,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';

function PricingConfig() {
  const [pricingData, setPricingData] = useState({});
  const [selectedProvider, setSelectedProvider] = useState('aws');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [expanded, setExpanded] = useState('network');

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      const response = await axios.get('http://localhost:8000/pricing');
      setPricingData(response.data);
      setLoading(false);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Error fetching pricing data: ' + error.message,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handlePricingChange = (category, subcategory, key, value) => {
    setPricingData(prev => ({
      ...prev,
      [selectedProvider]: {
        ...prev[selectedProvider],
        [category]: {
          ...prev[selectedProvider][category],
          [subcategory]: {
            ...prev[selectedProvider][category][subcategory],
            [key]: parseFloat(value) || 0
          }
        }
      }
    }));
  };

  const handleSavePricing = async () => {
    try {
      await axios.post('http://localhost:8000/pricing', {
        pricing_data: pricingData
      });
      setNotification({
        open: true,
        message: 'Pricing data saved successfully!',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: 'Error saving pricing data: ' + (error.response?.data?.detail || error.message),
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const renderNetworkPricing = () => (
    <Accordion expanded={expanded === 'network'} onChange={handleAccordionChange('network')}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Network Pricing</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {['Small', 'Medium', 'Large'].map(size => (
            <Grid item xs={12} key={size}>
              <Typography variant="subtitle1">{size}</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Data Transfer Cost"
                    type="number"
                    value={pricingData[selectedProvider]?.network?.[size]?.data_transfer || 0}
                    onChange={(e) => handlePricingChange('network', size, 'data_transfer', e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Bandwidth Cost"
                    type="number"
                    value={pricingData[selectedProvider]?.network?.[size]?.bandwidth || 0}
                    onChange={(e) => handlePricingChange('network', size, 'bandwidth', e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderConsumerPricing = () => (
    <Accordion expanded={expanded === 'consumer'} onChange={handleAccordionChange('consumer')}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Consumer Pricing</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="API Calls Cost"
              type="number"
              value={pricingData[selectedProvider]?.consumer?.api_calls || 0}
              onChange={(e) => handlePricingChange('consumer', 'api_calls', '', e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Data Distribution Cost"
              type="number"
              value={pricingData[selectedProvider]?.consumer?.data_distribution || 0}
              onChange={(e) => handlePricingChange('consumer', 'data_distribution', '', e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderInfrastructurePricing = () => (
    <Accordion expanded={expanded === 'infrastructure'} onChange={handleAccordionChange('infrastructure')}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Infrastructure Pricing</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle1">Compute</Typography>
            <Grid container spacing={2}>
              {['small', 'medium', 'large'].map(size => (
                <Grid item xs={4} key={size}>
                  <TextField
                    fullWidth
                    label={`${size.charAt(0).toUpperCase() + size.slice(1)} Instance`}
                    type="number"
                    value={pricingData[selectedProvider]?.infrastructure?.compute?.[size] || 0}
                    onChange={(e) => handlePricingChange('infrastructure', 'compute', size, e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1">Storage</Typography>
            <Grid container spacing={2}>
              {['standard', 'premium'].map(type => (
                <Grid item xs={6} key={type}>
                  <TextField
                    fullWidth
                    label={`${type.charAt(0).toUpperCase() + type.slice(1)} Storage`}
                    type="number"
                    value={pricingData[selectedProvider]?.infrastructure?.storage?.[type] || 0}
                    onChange={(e) => handlePricingChange('infrastructure', 'storage', type, e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1">Services</Typography>
            <Grid container spacing={2}>
              {['monitoring', 'logging'].map(service => (
                <Grid item xs={6} key={service}>
                  <TextField
                    fullWidth
                    label={`${service.charAt(0).toUpperCase() + service.slice(1)} Service`}
                    type="number"
                    value={pricingData[selectedProvider]?.infrastructure?.services?.[service] || 0}
                    onChange={(e) => handlePricingChange('infrastructure', 'services', service, e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading pricing data...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Cloud Provider Pricing Configuration
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Cloud Provider</InputLabel>
            <Select
              value={selectedProvider}
              label="Cloud Provider"
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              <MenuItem value="aws">AWS</MenuItem>
              <MenuItem value="azure">Azure</MenuItem>
              <MenuItem value="gcp">GCP</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {renderNetworkPricing()}
        {renderConsumerPricing()}
        {renderInfrastructurePricing()}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSavePricing}
          >
            Save Pricing Configuration
          </Button>
        </Box>

        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
        >
          <Alert onClose={handleCloseNotification} severity={notification.severity}>
            {notification.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
}

export default PricingConfig; 