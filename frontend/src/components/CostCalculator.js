import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Container,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Modal,
  IconButton,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  Radio,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import axios from 'axios';

function CostCalculator() {
  const defaultScaleConfig = {
    consumers_per_tenant: 3,
    total_tenants: 5000,
    endpoints_per_tenant: 10000
  };

  const defaultNetworkConfig = {
    api: {
      calls_per_day: 189,
      request_size_mb: 1.076
    },
    messages: {
      events_per_day: 100010,
      message_size_kb: 1
    }
  };

  const minimalConfig = {
    scale: {
      consumers_per_tenant: 1,
      total_tenants: 1,
      endpoints_per_tenant: 1
    },
    network_load: {
      api: {
        calls_per_day: 1,
        request_size_mb: 1
      },
      messages: {
        events_per_day: 1,
        message_size_kb: 1
      }
    }
  };

  const cloudProviders = {
    aws: {
      name: 'Amazon Web Services',
      regions: [
        { id: 'us-east-1', name: 'US East (N. Virginia)' },
        { id: 'us-west-2', name: 'US West (Oregon)' },
        { id: 'eu-west-1', name: 'Europe (Ireland)' },
        { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' }
      ]
    },
    azure: {
      name: 'Microsoft Azure',
      regions: [
        { id: 'eastus', name: 'East US' },
        { id: 'westus2', name: 'West US 2' },
        { id: 'northeurope', name: 'North Europe' },
        { id: 'southeastasia', name: 'Southeast Asia' }
      ]
    },
    gcp: {
      name: 'Google Cloud Platform',
      regions: [
        { id: 'us-east1', name: 'South Carolina' },
        { id: 'us-west1', name: 'Oregon' },
        { id: 'europe-west1', name: 'Belgium' },
        { id: 'asia-southeast1', name: 'Singapore' }
      ]
    }
  };

  const [formData, setFormData] = useState({
    cloud_provider: 'aws',
    region: 'us-west-2',
    scale: defaultScaleConfig
  });

  const [scaleConfigEnabled, setScaleConfigEnabled] = useState(false);
  const [scaleConfigModalOpen, setScaleConfigModalOpen] = useState(false);
  const [networkLoadEnabled, setNetworkLoadEnabled] = useState(false);
  const [networkLoadModalOpen, setNetworkLoadModalOpen] = useState(false);
  const [networkLoadConfig, setNetworkLoadConfig] = useState(defaultNetworkConfig);
  const [costPeriod, setCostPeriod] = useState('monthly');

  const [costBreakdown, setCostBreakdown] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [costDetailModal, setCostDetailModal] = useState({
    open: false,
    title: '',
    details: null
  });

  const [cloudConfigModalOpen, setCloudConfigModalOpen] = useState(false);

  // Add storage cost state variables
  const [storageCosts, setStorageCosts] = useState({
    dynamodb_final_cost: 0,
    s3_final_cost: 0
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      scale: {
        ...prev.scale,
        [field]: parseInt(value) || 0
      }
    }));
  };

  const handleScaleConfigChange = (event) => {
    setScaleConfigEnabled(event.target.checked);
    if (event.target.checked) {
      setScaleConfigModalOpen(true);
    }
  };

  const handleNetworkLoadChange = (event) => {
    setNetworkLoadEnabled(event.target.checked);
    if (event.target.checked) {
      setNetworkLoadModalOpen(true);
    }
  };

  const handleNetworkConfigChange = (category, field, value) => {
    setNetworkLoadConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const handleRegionChange = async (event) => {
    const newRegion = event.target.value;
    console.log('DEBUG: Region change initiated with new region:', newRegion);
    
    // Update form data with new region
    setFormData(prevData => {
      const updatedData = {
        ...prevData,
        region: newRegion
      };
      console.log('DEBUG: Updated form data:', updatedData);
      
      // Immediately calculate costs with new region
      calculateCostsWithData(updatedData);
      
      return updatedData;
    });
  };

  const calculateCostsWithData = async (data) => {
    try {
      // Ensure we have a valid region
      if (!data.region) {
        throw new Error('Region must be specified');
      }

      const requestData = {
        scale: scaleConfigEnabled ? {
          consumers_per_tenant: data.scale.consumers_per_tenant,
          total_tenants: data.scale.total_tenants,
          endpoints_per_tenant: data.scale.endpoints_per_tenant
        } : minimalConfig.scale,
        cloud_provider: data.cloud_provider,
        region: data.region,  // Ensure region is at the top level
        deployment: {
          num_tenants: scaleConfigEnabled ? data.scale.total_tenants : minimalConfig.scale.total_tenants,
          consumers_per_tenant: scaleConfigEnabled ? data.scale.consumers_per_tenant : minimalConfig.scale.consumers_per_tenant,
          endpoints_per_tenant: scaleConfigEnabled ? data.scale.endpoints_per_tenant : minimalConfig.scale.endpoints_per_tenant,
          messages_per_day: networkLoadEnabled ? networkLoadConfig.messages.events_per_day : minimalConfig.network_load.messages.events_per_day,
          api_requests_per_day: networkLoadEnabled ? networkLoadConfig.api.calls_per_day : minimalConfig.network_load.api.calls_per_day,
          data_throughput_gb: networkLoadEnabled ? 
            ((networkLoadConfig.api.calls_per_day * networkLoadConfig.api.request_size_mb / 1024) +
             (networkLoadConfig.messages.events_per_day * networkLoadConfig.messages.message_size_kb / (1024 * 1024))) : 
            ((minimalConfig.network_load.api.calls_per_day * minimalConfig.network_load.api.request_size_mb / 1024) +
             (minimalConfig.network_load.messages.events_per_day * minimalConfig.network_load.messages.message_size_kb / (1024 * 1024))),
          data_per_tenant_gb: 1,
          region: data.region,  // Also include region in deployment
          network_metrics: {
            message_size_kb: networkLoadEnabled ? networkLoadConfig.messages.message_size_kb : minimalConfig.network_load.messages.message_size_kb
          }
        }
      };
      
      console.log('DEBUG: Sending request with data:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post('http://localhost:8000/calculate-cost', requestData);
      console.log('DEBUG: Received response:', JSON.stringify(response.data, null, 2));
      
      // Verify the region in the response
      if (response.data.metadata?.region !== data.region) {
        console.error('Region mismatch - Sent:', data.region, 'Received:', response.data.metadata?.region);
      }
      
      setCostBreakdown(response.data);
      setCloudConfigModalOpen(false);
      setNotification({
        open: true,
        message: `Costs updated for region: ${cloudProviders[data.cloud_provider].regions.find(r => r.id === data.region)?.name}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error calculating costs with new region:', error);
      console.error('Error details:', error.response?.data);
      setNotification({
        open: true,
        message: 'Error updating costs for new region: ' + (error.response?.data?.detail || error.message),
        severity: 'error'
      });
    }
  };

  const handleProviderChange = async (event) => {
    const newProvider = event.target.value;
    const defaultRegion = cloudProviders[newProvider].regions[0].id;
    
    console.log('Provider changing to:', newProvider, 'with default region:', defaultRegion);
    
    // Update form data with new provider and its default region
    setFormData(prevData => {
      const updatedData = {
        ...prevData,
        cloud_provider: newProvider,
        region: defaultRegion
      };
      
      // Immediately calculate costs with new provider and region
      calculateCostsWithData(updatedData);
      
      return updatedData;
    });
  };

  const calculateCosts = async () => {
    calculateCostsWithData(formData);
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: 800,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    maxHeight: '90vh',
    overflow: 'auto'
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) {
      return '$0.000';
    }
    const multiplier = costPeriod === 'yearly' ? 12 : costPeriod === 'daily' ? 1/30 : 1;
    return `$${(Number(value) * multiplier).toFixed(3)}`;
  };

  const getDynamoDBDetails = (dynamodb_cost, formData) => {
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;

    // Constants - use minimal config if scale is not enabled
    const total_items = scaleConfigEnabled ? 
                       (formData.scale.total_tenants * formData.scale.endpoints_per_tenant) :
                       (minimalConfig.scale.total_tenants * minimalConfig.scale.endpoints_per_tenant);
    
    const storage_gb = (total_items * 4) / (1024 * 1024); // 4KB per item
    const daily_writes = networkLoadEnabled ? 
                        networkLoadConfig.messages.events_per_day + networkLoadConfig.api.calls_per_day :
                        1;
    const daily_reads = daily_writes * 2;
    const monthly_writes = daily_writes * 30;
    const monthly_reads = daily_reads * 30;
    
    // Use fixed base cost for minimal configuration
    const base_cost = 0.03;  // Fixed base cost
    const final_cost = base_cost * region_multiplier;  // Calculate final cost with multiplier
    
    const displayTenants = scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants;
    const displayEndpoints = scaleConfigEnabled ? formData.scale.endpoints_per_tenant : minimalConfig.scale.endpoints_per_tenant;
    
    return [
      {
        title: 'Storage Cost Calculation',
        items: [
          {
            label: 'Total Items',
            value: total_items.toLocaleString(),
            details: [
              `Number of tenants: ${displayTenants.toLocaleString()}`,
              `Endpoints per tenant: ${displayEndpoints.toLocaleString()}`,
              `Total items = ${displayTenants.toLocaleString()} × ${displayEndpoints.toLocaleString()} = ${total_items.toLocaleString()}`
            ]
          },
          {
            label: 'Storage Size',
            value: `${storage_gb.toFixed(2)} GB`,
            details: [
              'Item size: 4 KB',
              `Total storage = (${total_items.toLocaleString()} items × 4 KB) / (1024 × 1024)`,
              `= ${storage_gb.toFixed(2)} GB`
            ]
          }
        ]
      },
      {
        title: 'Write Operations Cost',
        items: [
          {
            label: 'Daily Write Operations',
            value: daily_writes.toLocaleString(),
            details: [
              `Messages per day: ${networkLoadEnabled ? networkLoadConfig.messages.events_per_day.toLocaleString() : '1'}`,
              `API calls per day: ${networkLoadEnabled ? networkLoadConfig.api.calls_per_day.toLocaleString() : '1'}`,
              `Total daily writes = ${networkLoadEnabled ? 
                `${networkLoadConfig.messages.events_per_day.toLocaleString()} + ${networkLoadConfig.api.calls_per_day.toLocaleString()}` : 
                '1'} = ${daily_writes.toLocaleString()}`
            ]
          },
          {
            label: 'Monthly Write Operations',
            value: monthly_writes.toLocaleString(),
            details: [
              `Daily writes × 30 days`,
              `${daily_writes.toLocaleString()} × 30 = ${monthly_writes.toLocaleString()} operations`
            ]
          }
        ]
      },
      {
        title: 'Read Operations Cost',
        items: [
          {
            label: 'Daily Read Operations',
            value: daily_reads.toLocaleString(),
            details: [
              'Assuming 2 reads per write',
              `Daily reads = ${daily_writes.toLocaleString()} × 2`,
              `= ${daily_reads.toLocaleString()} operations`
            ]
          },
          {
            label: 'Monthly Read Operations',
            value: monthly_reads.toLocaleString(),
            details: [
              `Daily reads × 30 days`,
              `${daily_reads.toLocaleString()} × 30 = ${monthly_reads.toLocaleString()} operations`
            ]
          }
        ]
      },
      {
        title: 'Final Cost (After Region Multiplier)',
        items: [
          {
            label: 'Base cost',
            value: formatCurrency(base_cost),
            details: [
              'Fixed base cost for minimal configuration: $0.03'
            ]
          },
          {
            label: `Region multiplier (${formData.region})`,
            value: `${region_multiplier}x`,
            details: []
          },
          {
            label: 'Final cost',
            value: formatCurrency(final_cost),
            details: [
              `${formatCurrency(base_cost)} × ${region_multiplier}`,
              `= ${formatCurrency(final_cost)}`
            ]
          }
        ]
      }
    ];
  };

  const getStorageDetails = () => {
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;

    // Calculate DynamoDB costs
    const total_items = scaleConfigEnabled ? 
                       (formData.scale.total_tenants * formData.scale.endpoints_per_tenant) :
                       (minimalConfig.scale.total_tenants * minimalConfig.scale.endpoints_per_tenant);
    const storage_gb = (total_items * 4) / (1024 * 1024); // 4KB per item
    const dynamodb_storage_cost = storage_gb * 0.25; // $0.25 per GB-month
    const dynamodb_final_cost = dynamodb_storage_cost * region_multiplier;

    // Calculate S3 costs
    const daily_messages = networkLoadEnabled ? networkLoadConfig.messages.events_per_day : 1;
    const message_size_kb = networkLoadEnabled ? networkLoadConfig.messages.message_size_kb : 1;
    const monthly_storage_gb = (daily_messages * message_size_kb * 30) / (1024 * 1024);
    const s3_storage_cost = monthly_storage_gb * 0.023; // $0.023 per GB-month
    const s3_final_cost = s3_storage_cost * region_multiplier;

    // Get current configuration values
    const displayTenants = scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants;
    const displayEndpoints = scaleConfigEnabled ? formData.scale.endpoints_per_tenant : minimalConfig.scale.endpoints_per_tenant;

    return [
      {
        title: 'DynamoDB Storage Details',
        items: [
          {
            label: 'Configuration',
            value: scaleConfigEnabled ? 'Custom' : 'Minimal',
            details: [
              `Total Tenants: ${displayTenants.toLocaleString()}`,
              `Endpoints per Tenant: ${displayEndpoints.toLocaleString()}`,
              `Total Items: ${total_items.toLocaleString()} (${displayTenants.toLocaleString()} × ${displayEndpoints.toLocaleString()})`,
              `Storage per Item: 4 KB`,
              `Total Storage: ${storage_gb.toFixed(3)} GB`
            ]
          },
          {
            label: 'Cost Calculation',
            value: formatCurrency(dynamodb_final_cost),
            details: [
              `Storage Rate: $0.25 per GB-month`,
              `Base Storage Cost: ${formatCurrency(dynamodb_storage_cost)}`,
              `Region Multiplier (${formData.region}): ${region_multiplier}x`,
              `Final Cost: ${formatCurrency(dynamodb_final_cost)}`
            ]
          }
        ]
      },
      {
        title: 'S3 Storage Details',
        items: [
          {
            label: 'Configuration',
            value: networkLoadEnabled ? 'Custom' : 'Minimal',
            details: [
              `Daily Messages: ${daily_messages.toLocaleString()}`,
              `Message Size: ${message_size_kb} KB`,
              `Monthly Storage: ${monthly_storage_gb.toFixed(3)} GB`
            ]
          },
          {
            label: 'Cost Calculation',
            value: formatCurrency(s3_final_cost),
            details: [
              `Storage Rate: $0.023 per GB-month`,
              `Base Storage Cost: ${formatCurrency(s3_storage_cost)}`,
              `Region Multiplier (${formData.region}): ${region_multiplier}x`,
              `Final Cost: ${formatCurrency(s3_final_cost)}`
            ]
          }
        ]
      },
      {
        title: 'Total Storage Cost',
        items: [
          {
            label: 'DynamoDB Storage',
            value: formatCurrency(dynamodb_final_cost),
            details: [`${storage_gb.toFixed(3)} GB at ${formatCurrency(dynamodb_final_cost)}`]
          },
          {
            label: 'S3 Storage',
            value: formatCurrency(s3_final_cost),
            details: [`${monthly_storage_gb.toFixed(3)} GB at ${formatCurrency(s3_final_cost)}`]
          },
          {
            label: 'Total Cost',
            value: formatCurrency(dynamodb_final_cost + s3_final_cost),
            details: [
              `DynamoDB: ${formatCurrency(dynamodb_final_cost)}`,
              `S3: ${formatCurrency(s3_final_cost)}`,
              `Total: ${formatCurrency(dynamodb_final_cost + s3_final_cost)}`
            ]
          }
        ]
      }
    ];
  };

  const getContainerDetails = (container) => {
    if (!container) return [];
    
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;
    
    const base_cost = container / region_multiplier;
    const cluster_base = base_cost * 0.3;
    const node_base = base_cost * 0.7;
    
    return [
      {
        title: 'Base Cost Calculation',
        items: [
          {
            label: 'EKS Cluster Management',
            value: formatCurrency(cluster_base),
            details: [
              'Base monthly cluster cost: $73.00',
              'Cluster management: 30% of total container cost',
              `Base cluster cost: ${formatCurrency(cluster_base)}`
            ]
          },
          {
            label: 'EC2 Node Groups',
            value: formatCurrency(node_base),
            details: [
              'Base EC2 compute cost: $71.54 per node',
              'Node groups: 70% of total container cost',
              `Base node groups cost: ${formatCurrency(node_base)}`
            ]
          },
          {
            label: 'Total Base Cost',
            value: formatCurrency(base_cost),
            details: [
              `Cluster management: ${formatCurrency(cluster_base)}`,
              `Node groups: ${formatCurrency(node_base)}`,
              `Total base cost: ${formatCurrency(base_cost)}`
            ]
          }
        ]
      },
      {
        title: 'Container Costs with Region Multiplier',
        items: [
          {
            label: 'Final Container Costs',
            value: formatCurrency(container),
            details: [
              `Base cost: ${formatCurrency(base_cost)}`,
              `Region multiplier: ${region_multiplier}x`,
              `Final cost: ${formatCurrency(container)}`
            ]
          }
        ]
      }
    ];
  };

  const getNetworkDetails = (network) => {
    if (!network) return [];
    
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;
    
    const throughput_base = network.throughput_cost / region_multiplier;
    const msk_base = network.msk_cost / region_multiplier;
    
    return [
      {
        title: 'Base Cost Calculation',
        items: [
          {
            label: 'Data Transfer Base Costs',
            value: formatCurrency(throughput_base),
            details: [
              'Data transfer rate: $1.50 per GB',
              'Inbound traffic: Free',
              `Base outbound traffic cost: ${formatCurrency(throughput_base)}`
            ]
          },
          {
            label: 'MSK Base Costs',
            value: formatCurrency(msk_base),
            details: [
              'Broker cluster cost: $101.85 per month',
              'Storage cost: $0.10 per GB per month',
              'Data transfer: $0.02 per GB',
              `Base MSK cost: ${formatCurrency(msk_base)}`
            ]
          }
        ]
      },
      {
        title: 'Network Costs with Region Multiplier',
        items: [
          {
            label: 'Data Transfer Costs',
            value: formatCurrency(network.throughput_cost),
            details: [
              `Base cost: ${formatCurrency(throughput_base)}`,
              `After region multiplier (${region_multiplier}x): ${formatCurrency(network.throughput_cost)}`
            ]
          },
          {
            label: 'MSK Costs',
            value: formatCurrency(network.msk_cost),
            details: [
              `Base cost: ${formatCurrency(msk_base)}`,
              `After region multiplier (${region_multiplier}x): ${formatCurrency(network.msk_cost)}`
            ]
          },
          {
            label: 'Total Network Costs',
            value: formatCurrency(network.throughput_cost + network.msk_cost),
            details: [
              `Data Transfer: ${formatCurrency(network.throughput_cost)}`,
              `MSK: ${formatCurrency(network.msk_cost)}`,
              `Total: ${formatCurrency(network.throughput_cost + network.msk_cost)}`
            ]
          }
        ]
      }
    ];
  };

  const getNetworkDataLoadDetails = (pxgrid_cost) => {
    if (!pxgrid_cost) return [];
    
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;
    
    // Use minimal configuration values if network load is not enabled
    const base_cost = 0.03;  // Fixed base cost
    const final_cost = base_cost * region_multiplier;

    // Calculate message and API costs based on configuration
    const message_publishing_base = networkLoadEnabled ? (pxgrid_cost / region_multiplier) * 0.7 : base_cost * 0.7;
    const api_load_base = networkLoadEnabled ? (pxgrid_cost / region_multiplier) * 0.3 : base_cost * 0.3;
    const message_publishing_final = message_publishing_base * region_multiplier;
    const api_load_final = api_load_base * region_multiplier;
    
    // Get the current configuration based on networkLoadEnabled flag
    const currentConfig = networkLoadEnabled ? networkLoadConfig : minimalConfig.network_load;
    
    return [
      {
        title: 'Base Cost Calculation',
        items: [
          {
            label: 'Base Cost (Before Region Multiplier)',
            value: formatCurrency(networkLoadEnabled ? pxgrid_cost / region_multiplier : base_cost),
            details: [
              'Daily Message Cost:',
              `- Messages per day: ${currentConfig.messages.events_per_day}`,
              `- Cost per million messages: $9.25`,
              `- Daily message cost: ${formatCurrency((currentConfig.messages.events_per_day * 9.25 / 1000000))}`,
              '',
              'Daily API Cost:',
              `- API calls per day: ${currentConfig.api.calls_per_day}`,
              `- Cost per API call: $0.00189`,
              `- Daily API cost: ${formatCurrency((currentConfig.api.calls_per_day * 0.00189))}`,
              '',
              `Monthly base cost: ${formatCurrency(networkLoadEnabled ? pxgrid_cost / region_multiplier : base_cost)} (30 days)`
            ]
          }
        ]
      },
      {
        title: 'Final Cost Calculation',
        items: [
          {
            label: 'Base cost',
            value: formatCurrency(networkLoadEnabled ? pxgrid_cost / region_multiplier : base_cost),
            details: []
          },
          {
            label: `Region multiplier (${formData.region})`,
            value: `${region_multiplier}x`,
            details: []
          },
          {
            label: 'Final cost',
            value: formatCurrency(networkLoadEnabled ? pxgrid_cost : final_cost),
            details: [
              `${formatCurrency(networkLoadEnabled ? pxgrid_cost / region_multiplier : base_cost)} × ${region_multiplier}`,
              `= ${formatCurrency(networkLoadEnabled ? pxgrid_cost : final_cost)}`
            ]
          }
        ]
      },
      {
        title: 'Cost Breakdown',
        items: [
          {
            label: 'Message Publishing (70%)', 
            value: formatCurrency(message_publishing_final), 
            details: [
              `Base cost: ${formatCurrency(message_publishing_base)}`,
              `After region multiplier: ${formatCurrency(message_publishing_final)}`
            ]
          },
          {
            label: 'API Load (30%)', 
            value: formatCurrency(api_load_final), 
            details: [
              `Base cost: ${formatCurrency(api_load_base)}`,
              `After region multiplier: ${formatCurrency(api_load_final)}`
            ]
          }
        ]
      }
    ];
  };

  const handleShowDetails = (type, data) => {
    let details;
    let title;

    switch (type) {
      case 'pxgrid':
        details = getNetworkDataLoadDetails(data);
        title = 'Network Data Load Cost Details';
        break;
      case 'storage':
        details = getStorageDetails();
        title = 'Storage Cost Details';
        break;
      case 'container':
        details = getContainerDetails(data);
        title = 'Container Infrastructure Cost Details';
        break;
      case 'network':
        details = getNetworkDetails(data);
        title = 'Network Cost Details';
        break;
      default:
        details = [];
    }

    setCostDetailModal({
      open: true,
      title,
      details
    });
  };

  const CostDetailModal = () => (
    <Modal
      open={costDetailModal.open}
      onClose={() => setCostDetailModal({ ...costDetailModal, open: false })}
    >
      <Box sx={modalStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{costDetailModal.title}</Typography>
          <IconButton onClick={() => setCostDetailModal({ ...costDetailModal, open: false })} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {costDetailModal.details?.map((section, idx) => (
          <Box key={idx} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }}>
              {section.title}
              {section.title === 'Base Cost Calculation' && (
                <Tooltip title="Shows how the base cost is calculated using minimal configuration values">
                  <InfoIcon fontSize="small" color="info" />
                </Tooltip>
              )}
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableBody>
                  {section.items.map((item, i) => (
                    <React.Fragment key={i}>
                      <TableRow>
                        <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.label}
                        </TableCell>
                        <TableCell align="right">{item.value}</TableCell>
                      </TableRow>
                      {item.details && item.details.map((detail, j) => (
                        <TableRow key={`${i}-${j}`} sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell colSpan={2} sx={{ pl: 4, py: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {detail}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}
      </Box>
    </Modal>
  );

  // Calculate storage costs whenever relevant dependencies change
  useEffect(() => {
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;

    // Calculate DynamoDB costs
    const total_items = scaleConfigEnabled ? 
                       (formData.scale.total_tenants * formData.scale.endpoints_per_tenant) :
                       (minimalConfig.scale.total_tenants * minimalConfig.scale.endpoints_per_tenant);
    const storage_gb = (total_items * 4) / (1024 * 1024); // 4KB per item
    const dynamodb_storage_cost = storage_gb * 0.25; // $0.25 per GB-month
    const dynamodb_final_cost = dynamodb_storage_cost * region_multiplier;

    // Calculate S3 costs
    const daily_messages = networkLoadEnabled ? networkLoadConfig.messages.events_per_day : 1;
    const message_size_kb = networkLoadEnabled ? networkLoadConfig.messages.message_size_kb : 1;
    const monthly_storage_gb = (daily_messages * message_size_kb * 30) / (1024 * 1024);
    const s3_storage_cost = monthly_storage_gb * 0.023; // $0.023 per GB-month
    const s3_final_cost = s3_storage_cost * region_multiplier;

    setStorageCosts({
      dynamodb_final_cost,
      s3_final_cost
    });
  }, [formData.region, formData.scale, scaleConfigEnabled, networkLoadEnabled, networkLoadConfig]);

  // Update the total cost calculation to use storageCosts
  const getTotalCost = () => {
    return (
      (costBreakdown?.breakdown?.pxgrid_cost || 0) +
      ((costBreakdown?.breakdown?.network?.throughput_cost || 0) + (costBreakdown?.breakdown?.network?.msk_cost || 0)) +
      (costBreakdown?.breakdown?.container_cost || 0) +
      (storageCosts.dynamodb_final_cost + storageCosts.s3_final_cost)
    );
  };

  const renderStorageCosts = () => {
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;

    // Calculate storage sizes for display
    const total_items = scaleConfigEnabled ? 
                       (formData.scale.total_tenants * formData.scale.endpoints_per_tenant) :
                       (minimalConfig.scale.total_tenants * minimalConfig.scale.endpoints_per_tenant);
    const storage_gb = (total_items * 4) / (1024 * 1024);
    
    const daily_messages = networkLoadEnabled ? networkLoadConfig.messages.events_per_day : 1;
    const message_size_kb = networkLoadEnabled ? networkLoadConfig.messages.message_size_kb : 1;
    const monthly_storage_gb = (daily_messages * message_size_kb * 30) / (1024 * 1024);

    return (
      <Card onClick={() => handleShowDetails('storage')} className="cost-card">
        <CardContent>
          <Typography variant="h6" component="div">
            Storage Costs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            DynamoDB: {formatCurrency(storageCosts.dynamodb_final_cost)} ({storage_gb.toFixed(3)} GB)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            S3: {formatCurrency(storageCosts.s3_final_cost)} ({monthly_storage_gb.toFixed(3)} GB)
          </Typography>
          <Typography variant="h6" component="div" style={{ marginTop: '8px' }}>
            Total: {formatCurrency(storageCosts.dynamodb_final_cost + storageCosts.s3_final_cost)}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h4" gutterBottom>
          PxGrid Cloud Cost Calculator
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Button
                  variant="outlined"
                  onClick={() => setCloudConfigModalOpen(true)}
                  startIcon={<InfoIcon />}
                >
                  {`${cloudProviders[formData.cloud_provider].name} - ${
                    cloudProviders[formData.cloud_provider].regions.find(
                      r => r.id === formData.region
                    )?.name
                  }`}
                </Button>
              }
              label="Cloud Provider & Region"
              labelPlacement="start"
              sx={{ 
                mx: 0,
                justifyContent: 'space-between',
                width: '100%'
              }}
            />

            <FormControl component="fieldset">
              <Typography variant="subtitle1" gutterBottom>
                Cost Period
              </Typography>
              <RadioGroup
                row
                value={costPeriod}
                onChange={(e) => setCostPeriod(e.target.value)}
              >
                <FormControlLabel 
                  value="daily" 
                  control={<Radio />} 
                  label="Daily" 
                />
                <FormControlLabel 
                  value="monthly" 
                  control={<Radio />} 
                  label="Monthly" 
                />
                <FormControlLabel 
                  value="yearly" 
                  control={<Radio />} 
                  label="Yearly" 
                />
              </RadioGroup>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={scaleConfigEnabled}
                  onChange={handleScaleConfigChange}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Configure Scale Parameters</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {scaleConfigEnabled ? 'Using custom configuration' : 'Using minimal values (1)'}
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={networkLoadEnabled}
                  onChange={handleNetworkLoadChange}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Configure Network Load</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {networkLoadEnabled ? 'Using custom configuration' : 'Using minimal values (1)'}
                  </Typography>
                </Box>
              }
            />
          </Stack>

          <Modal
            open={scaleConfigModalOpen}
            onClose={() => setScaleConfigModalOpen(false)}
          >
            <Box sx={modalStyle}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Scale Parameters Configuration</Typography>
                <IconButton onClick={() => setScaleConfigModalOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>

              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>S.No</TableCell>
                      <TableCell>Scale Parameters</TableCell>
                      <TableCell>Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>1</TableCell>
                      <TableCell>Cloud consumer per Tenant</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={formData.scale.consumers_per_tenant}
                          onChange={(e) => handleInputChange('consumers_per_tenant', e.target.value)}
                          size="small"
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2</TableCell>
                      <TableCell>Total Tenant</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={formData.scale.total_tenants}
                          onChange={(e) => handleInputChange('total_tenants', e.target.value)}
                          size="small"
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>3</TableCell>
                      <TableCell>Total End-points per Tenant</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={formData.scale.endpoints_per_tenant}
                          onChange={(e) => handleInputChange('endpoints_per_tenant', e.target.value)}
                          size="small"
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={() => setScaleConfigModalOpen(false)}
                >
                  Save Configuration
                </Button>
              </Box>
            </Box>
          </Modal>

          <Modal
            open={networkLoadModalOpen}
            onClose={() => setNetworkLoadModalOpen(false)}
          >
            <Box sx={modalStyle}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Network Load Configuration</Typography>
                <IconButton onClick={() => setNetworkLoadModalOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>API Configuration</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Average API Calls per Day"
                        type="number"
                        value={networkLoadConfig.api.calls_per_day}
                        onChange={(e) => handleNetworkConfigChange('api', 'calls_per_day', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Average Request Size (MB)"
                        type="number"
                        value={networkLoadConfig.api.request_size_mb}
                        onChange={(e) => handleNetworkConfigChange('api', 'request_size_mb', e.target.value)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Message Events Configuration</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Average Events per Day"
                        type="number"
                        value={networkLoadConfig.messages.events_per_day}
                        onChange={(e) => handleNetworkConfigChange('messages', 'events_per_day', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Average Message Size (KB)"
                        type="number"
                        value={networkLoadConfig.messages.message_size_kb}
                        onChange={(e) => handleNetworkConfigChange('messages', 'message_size_kb', e.target.value)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={() => setNetworkLoadModalOpen(false)}
                >
                  Save Configuration
                </Button>
              </Box>
            </Box>
          </Modal>

          <Modal
            open={cloudConfigModalOpen}
            onClose={() => setCloudConfigModalOpen(false)}
          >
            <Box sx={modalStyle}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Cloud Provider & Region Configuration</Typography>
                <IconButton onClick={() => setCloudConfigModalOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Cloud Provider</InputLabel>
                    <Select
                      value={formData.cloud_provider}
                      onChange={handleProviderChange}
                      label="Cloud Provider"
                    >
                      {Object.entries(cloudProviders).map(([key, provider]) => (
                        <MenuItem key={key} value={key}>
                          {provider.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Region</InputLabel>
                    <Select
                      value={formData.region}
                      onChange={handleRegionChange}
                      label="Region"
                    >
                      {cloudProviders[formData.cloud_provider].regions.map((region) => (
                        <MenuItem key={region.id} value={region.id}>
                          {region.name} ({region.id}) - {region.id === 'us-east-1' ? '1.0x' :
                            region.id === 'us-west-2' ? '1.05x' :
                            region.id === 'eu-west-1' ? '1.12x' :
                            region.id === 'ap-southeast-1' ? '1.15x' : '1.0x'} base price
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Current Region: {cloudProviders[formData.cloud_provider].regions.find(r => r.id === formData.region)?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Price Multiplier: {formData.region === 'us-east-1' ? '1.0x' :
                      formData.region === 'us-west-2' ? '1.05x' :
                      formData.region === 'eu-west-1' ? '1.12x' :
                      formData.region === 'ap-southeast-1' ? '1.15x' : '1.0x'} base price
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setCloudConfigModalOpen(false)}
                >
                  Close
                </Button>
              </Box>
            </Box>
          </Modal>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={calculateCosts}
            >
              Calculate Costs
            </Button>
          </Box>
        </Box>

        {costBreakdown && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>Cost Breakdown ({costPeriod.charAt(0).toUpperCase() + costPeriod.slice(1)})</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleShowDetails('pxgrid', costBreakdown?.breakdown?.pxgrid_cost)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Network Data Load Costs</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="h6">
                    {formatCurrency(costBreakdown?.breakdown?.pxgrid_cost)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                {renderStorageCosts()}
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleShowDetails('container', costBreakdown?.breakdown?.container_cost)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Container Costs</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="h6">
                    {formatCurrency(costBreakdown?.breakdown?.container_cost)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleShowDetails('network', costBreakdown?.breakdown?.network)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Network Costs</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    Throughput: {formatCurrency(costBreakdown?.breakdown?.network?.throughput_cost)}
                  </Typography>
                  <Typography variant="body2">
                    MSK: {formatCurrency(costBreakdown?.breakdown?.network?.msk_cost)}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Total: "{formatCurrency(
                      (costBreakdown?.breakdown?.network?.throughput_cost || 0) + 
                      (costBreakdown?.breakdown?.network?.msk_cost || 0)
                    )}"
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Typography variant="h6">
                    Total Monthly Cost: {formatCurrency(getTotalCost())}
                  </Typography>
                  <Typography variant="subtitle1">
                    Cost per Tenant: {formatCurrency(
                      getTotalCost() /
                      (scaleConfigEnabled ? formData.scale.total_tenants : 1)
                    )}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <CostDetailModal />
          </Box>
        )}

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

export default CostCalculator; 