import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import SettingsIcon from '@mui/icons-material/Settings';

function Navbar() {
  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          <CalculateIcon sx={{ mr: 2 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            Cloud Infrastructure Cost Calculator
          </Typography>
          <Box>
            <Button
              color="inherit"
              component={RouterLink}
              to="/"
              startIcon={<CalculateIcon />}
            >
              Calculator
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/pricing"
              startIcon={<SettingsIcon />}
            >
              Pricing Config
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar; 