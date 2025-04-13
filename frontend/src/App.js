import React from 'react';
import { Box, Container, Tab, Tabs } from '@mui/material';
import PricingConfig from './components/PricingConfig';
import CostCalculator from './components/CostCalculator';

function App() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange}>
            <Tab label="Cost Calculator" />
            <Tab label="Pricing Configuration" />
          </Tabs>
        </Box>
        <Box sx={{ mt: 3 }}>
          {value === 0 && <CostCalculator />}
          {value === 1 && <PricingConfig />}
        </Box>
      </Box>
    </Container>
  );
}

export default App; 