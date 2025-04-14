import React from 'react';
import { Box, Container } from '@mui/material';
import CostCalculator from './components/CostCalculator';

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', mt: 3 }}>
        <Box sx={{ mt: 3 }}>
          <CostCalculator />
        </Box>
      </Box>
    </Container>
  );
}

export default App; 