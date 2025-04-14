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

  // Add a safe number formatting helper
  const safeFormatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '$0.00';
    }
    return formatCurrency(value);
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

  const getCloudInfraDetails = (costs) => {
    if (!costs) return [];
    
    const nat_gateway = costs.nat_gateway || 0;
    const vpc_endpoints = costs.vpc_endpoints || 0;
    const transit_gateway = costs.transit_gateway || 0;
    const route53 = costs.route53 || 0;
    
    const total = (nat_gateway + vpc_endpoints + transit_gateway + route53) / 12;
    
    return [
      {
        title: 'AWS Cloud Infrastructure Components',
        items: [
          {
            label: 'NAT Gateway',
            value: safeFormatCurrency(nat_gateway / 12),
            details: ['$32 per month']
          },
          {
            label: 'VPC Endpoints',
            value: safeFormatCurrency(vpc_endpoints / 12),
            details: ['$10 per month']
          },
          {
            label: 'Transit Gateway',
            value: safeFormatCurrency(transit_gateway / 12),
            details: ['$3 per month']
          },
          {
            label: 'Route 53',
            value: safeFormatCurrency(route53 / 12),
            details: ['$15 per month']
          }
        ],
        total: safeFormatCurrency(total)
      }
    ];
  };

  const getInfraManagementDetails = (costs) => {
    if (!costs) return [];
    
    const terraform = costs.terraform_saas || 0;
    const gitlab = costs.gitlab_ci || 0;
    const slack = costs.slack_seat || 0;
    
    const total = (terraform + gitlab + slack) / 12;
    
    return [
      {
        title: 'Infrastructure Management Tools',
        items: [
          {
            label: 'Terraform (SaaS)',
            value: safeFormatCurrency(terraform / 12),
            details: ['$12 per month']
          },
          {
            label: 'GitLab CI Pipeline',
            value: safeFormatCurrency(gitlab / 12),
            details: ['$21 per month']
          },
          {
            label: 'Slack (1 seat)',
            value: safeFormatCurrency(slack / 12),
            details: ['$2 per month']
          }
        ],
        total: safeFormatCurrency(total)
      }
    ];
  };

  const getSecurityToolsDetails = (costs) => {
    if (!costs) return [];
    
    const security_hub = costs.security_hub || 0;
    const waf = costs.waf || 0;
    const shield = costs.shield_advanced || 0;
    const guard_duty = costs.guard_duty || 0;
    
    const total = (security_hub + waf + shield + guard_duty) / 12;
    
    return [
      {
        title: 'Security Tools',
        items: [
          {
            label: 'Security Hub',
            value: safeFormatCurrency(security_hub / 12),
            details: ['$40 per month']
          },
          {
            label: 'WAF',
            value: safeFormatCurrency(waf / 12),
            details: ['$25 per month']
          },
          {
            label: 'Shield Advanced',
            value: safeFormatCurrency(shield / 12),
            details: ['$300 per month']
          },
          {
            label: 'GuardDuty',
            value: safeFormatCurrency(guard_duty / 12),
            details: ['$12 per month']
          }
        ],
        total: safeFormatCurrency(total)
      }
    ];
  };

  const getMonitoringDetails = (costs) => {
    if (!costs) return [];
    
    // Get current configuration values based on enabled flags
    const total_tenants = scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants;
    const endpoints_per_tenant = scaleConfigEnabled ? formData.scale.endpoints_per_tenant : minimalConfig.scale.endpoints_per_tenant;
    const total_endpoints = total_tenants * endpoints_per_tenant;
    
    // Calculate daily events for monitoring
    const daily_messages = networkLoadEnabled ? networkLoadConfig.messages.events_per_day : minimalConfig.network_load.messages.events_per_day;
    const daily_api_calls = networkLoadEnabled ? networkLoadConfig.api.calls_per_day : minimalConfig.network_load.api.calls_per_day;
    const total_daily_events = daily_messages + daily_api_calls;
    
    // Base costs (annual) - use minimal values if configurations are disabled
    const base_cloudwatch_metrics = 240; // $20 per month * 12
    const base_cloudwatch_management = 40; // $3.33 per month * 12
    const base_systems_manager = 360; // $30 per month * 12
    const base_prometheus = 600; // $50 per month * 12

    // Use minimal costs when configurations are disabled
    const cloudwatch_metrics = scaleConfigEnabled ? (costs.cloudwatch_metrics || base_cloudwatch_metrics) : base_cloudwatch_metrics;
    const cloudwatch_management = scaleConfigEnabled ? (costs.cloudwatch_management || base_cloudwatch_management) : base_cloudwatch_management;
    const systems_manager = scaleConfigEnabled ? (costs.systems_manager || base_systems_manager) : base_systems_manager;
    const prometheus = scaleConfigEnabled ? (costs.managed_prometheus || base_prometheus) : base_prometheus;
    
    // Calculate metric counts and adjustments
    const base_metrics_per_endpoint = 5; // Basic metrics per endpoint
    const total_metrics = total_endpoints * base_metrics_per_endpoint;
    const metrics_cost_multiplier = scaleConfigEnabled ? Math.max(1, Math.ceil(total_metrics / 20000)) : 1; // Each 20K metrics tier
    
    // Adjust costs based on scale and load
    const adjusted_cloudwatch = cloudwatch_metrics * metrics_cost_multiplier;
    const adjusted_prometheus = prometheus * (scaleConfigEnabled ? Math.max(1, Math.ceil(total_endpoints / 1000)) : 1);
    
    // Calculate monthly costs
    const monthly_cloudwatch = adjusted_cloudwatch / 12;
    const monthly_cloudwatch_mgmt = cloudwatch_management / 12;
    const monthly_systems_manager = (systems_manager * (scaleConfigEnabled ? Math.max(1, Math.ceil(total_tenants / 100)) : 1)) / 12;
    const monthly_prometheus = adjusted_prometheus / 12;
    
    const total = monthly_cloudwatch + monthly_cloudwatch_mgmt + monthly_systems_manager + monthly_prometheus;
    
    return [
      {
        title: 'Scale-Based Metrics',
        items: [
          {
            label: 'Total Endpoints Monitored',
            value: total_endpoints.toLocaleString(),
            details: [
              `Configuration: ${scaleConfigEnabled ? 'Custom' : 'Minimal'}`,
              `Tenants: ${total_tenants.toLocaleString()}`,
              `Endpoints per tenant: ${endpoints_per_tenant.toLocaleString()}`,
              `Total endpoints: ${total_endpoints.toLocaleString()}`
            ]
          },
          {
            label: 'Total Daily Events',
            value: total_daily_events.toLocaleString(),
            details: [
              `Configuration: ${networkLoadEnabled ? 'Custom' : 'Minimal'}`,
              `Daily messages: ${daily_messages.toLocaleString()}`,
              `Daily API calls: ${daily_api_calls.toLocaleString()}`,
              `Total events: ${total_daily_events.toLocaleString()}`
            ]
          }
        ]
      },
      {
        title: 'CloudWatch Costs',
        items: [
          {
            label: 'CloudWatch Metrics',
            value: formatCurrency(monthly_cloudwatch),
            details: [
              `Configuration: ${scaleConfigEnabled ? 'Custom' : 'Minimal'}`,
              `Base cost: $20 per month for 20K metrics`,
              `Total metrics: ${total_metrics.toLocaleString()}`,
              `Metrics multiplier: ${metrics_cost_multiplier}x`,
              `Adjusted monthly cost: ${formatCurrency(monthly_cloudwatch)}`
            ]
          },
          {
            label: 'CloudWatch Management',
            value: formatCurrency(monthly_cloudwatch_mgmt),
            details: [
              `Configuration: ${scaleConfigEnabled ? 'Custom' : 'Minimal'}`,
              'Base cost: $3.33 per month'
            ]
          }
        ]
      },
      {
        title: 'Systems Manager & Prometheus',
        items: [
          {
            label: 'Systems Manager',
            value: formatCurrency(monthly_systems_manager),
            details: [
              `Configuration: ${scaleConfigEnabled ? 'Custom' : 'Minimal'}`,
              `Base cost: $30 per month per 100 tenants`,
              `Total tenants: ${total_tenants.toLocaleString()}`,
              `Tenant multiplier: ${scaleConfigEnabled ? Math.max(1, Math.ceil(total_tenants / 100)) : 1}x`,
              `Adjusted monthly cost: ${formatCurrency(monthly_systems_manager)}`
            ]
          },
          {
            label: 'Managed Prometheus',
            value: formatCurrency(monthly_prometheus),
            details: [
              `Configuration: ${scaleConfigEnabled ? 'Custom' : 'Minimal'}`,
              `Base cost: $50 per month per 1000 endpoints`,
              `Total endpoints: ${total_endpoints.toLocaleString()}`,
              `Endpoint multiplier: ${scaleConfigEnabled ? Math.max(1, Math.ceil(total_endpoints / 1000)) : 1}x`,
              `Adjusted monthly cost: ${formatCurrency(monthly_prometheus)}`
            ]
          }
        ]
      },
      {
        title: 'Total Monitoring Costs',
        items: [
          {
            label: 'Total Monthly Cost',
            value: formatCurrency(total),
            details: [
              `Configuration: ${scaleConfigEnabled ? 'Custom' : 'Minimal'}`,
              `CloudWatch Metrics: ${formatCurrency(monthly_cloudwatch)}`,
              `CloudWatch Management: ${formatCurrency(monthly_cloudwatch_mgmt)}`,
              `Systems Manager: ${formatCurrency(monthly_systems_manager)}`,
              `Managed Prometheus: ${formatCurrency(monthly_prometheus)}`,
              `Total: ${formatCurrency(total)}`
            ]
          }
        ]
      }
    ];
  };

  const getLoadBalancerDetails = (costs) => {
    if (!costs) return [];
    
    const region_multiplier = formData.region === 'us-east-1' ? 1.0 :
                            formData.region === 'us-west-2' ? 1.05 :
                            formData.region === 'eu-west-1' ? 1.12 :
                            formData.region === 'ap-southeast-1' ? 1.15 : 1.0;

    // Get current configuration values based on enabled flags
    const total_tenants = scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants;
    const consumers_per_tenant = scaleConfigEnabled ? formData.scale.consumers_per_tenant : minimalConfig.scale.consumers_per_tenant;
    
    // Calculate request costs
    const daily_api_calls = networkLoadEnabled ? 
        networkLoadConfig.api.calls_per_day * total_tenants * consumers_per_tenant :
        minimalConfig.network_load.api.calls_per_day * total_tenants * consumers_per_tenant;
    
    const monthly_api_calls = daily_api_calls * 30;
    const monthly_api_calls_millions = monthly_api_calls / 1_000_000;
    
    // API Gateway costs - $100 per million requests
    const api_gateway_cost = monthly_api_calls_millions * 100;
    
    // Application Load Balancer costs
    const alb_base_cost = 200; // Base cost of $200
    
    // Calculate total cost before region multiplier
    const total_base_cost = api_gateway_cost + alb_base_cost;
    const final_cost = total_base_cost * region_multiplier;
    
    return [
        {
            title: 'API Gateway Details',
            items: [
                {
                    label: 'Monthly API Calls',
                    value: monthly_api_calls.toLocaleString(),
                    details: [
                        `Daily API calls: ${daily_api_calls.toLocaleString()}`,
                        `Monthly API calls: ${daily_api_calls.toLocaleString()} × 30 = ${monthly_api_calls.toLocaleString()}`,
                        `API calls in millions: ${monthly_api_calls_millions.toFixed(3)}`
                    ]
                },
                {
                    label: 'API Gateway Cost',
                    value: formatCurrency(api_gateway_cost),
                    details: [
                        'Rate: $100 per million requests',
                        `Cost = ${monthly_api_calls_millions.toFixed(3)} million × $100`,
                        `= ${formatCurrency(api_gateway_cost)}`
                    ]
                }
            ]
        },
        {
            title: 'Application Load Balancer Details',
            items: [
                {
                    label: 'ALB Base Cost',
                    value: formatCurrency(alb_base_cost),
                    details: [
                        'Fixed monthly base cost: $200',
                        'Includes infrastructure and request costs'
                    ]
                }
            ]
        },
        {
            title: 'Final Cost Calculation',
            items: [
                {
                    label: 'API Gateway Cost',
                    value: formatCurrency(api_gateway_cost),
                    details: [
                        `Monthly API calls: ${monthly_api_calls.toLocaleString()}`,
                        `API calls in millions: ${monthly_api_calls_millions.toFixed(3)}`,
                        `Rate: $100 per million requests`,
                        `Cost = ${monthly_api_calls_millions.toFixed(3)} million × $100`,
                        `= ${formatCurrency(api_gateway_cost)}`
                    ]
                },
                {
                    label: 'ALB Base Cost',
                    value: formatCurrency(alb_base_cost),
                    details: [
                        'Fixed monthly base cost: $200',
                        'Includes infrastructure and request costs'
                    ]
                },
                {
                    label: 'Base cost (before region multiplier)',
                    value: formatCurrency(total_base_cost),
                    details: [
                        `API Gateway: ${formatCurrency(api_gateway_cost)}`,
                        `ALB Base: ${formatCurrency(alb_base_cost)}`,
                        `Total base cost: ${formatCurrency(total_base_cost)}`
                    ]
                },
                {
                    label: `Region multiplier (${formData.region})`,
                    value: `${region_multiplier}x`,
                    details: []
                },
                {
                    label: 'Final monthly cost',
                    value: formatCurrency(final_cost),
                    details: [
                        `${formatCurrency(total_base_cost)} × ${region_multiplier}`,
                        `= ${formatCurrency(final_cost)}`
                    ]
                }
            ]
        }
    ];
  };

  const getContainerManagementDetails = (costs) => {
    if (!costs) return [];
    
    return [
      {
        title: 'Container Management',
        items: [
          {
            label: 'ECR',
            value: formatCurrency(costs.ecr / 12),
            details: ['$50 per month']
          },
          {
            label: 'Helm Chart Storage',
            value: formatCurrency(costs.helm_storage / 12),
            details: ['$10 per month']
          },
          {
            label: 'ECS Fargate',
            value: formatCurrency(costs.ecs_fargate / 12),
            details: ['$40 per month']
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
      case 'cloud_infra':
        details = getCloudInfraDetails(costBreakdown?.breakdown);
        title = 'AWS Cloud Infrastructure Details';
        break;
      case 'infra_management':
        details = getInfraManagementDetails(costBreakdown?.breakdown);
        title = 'Infrastructure Management Details';
        break;
      case 'security':
        details = getSecurityToolsDetails(costBreakdown?.breakdown);
        title = 'Security Tools Details';
        break;
      case 'monitoring':
        details = getMonitoringDetails(costBreakdown?.breakdown);
        title = 'Monitoring Services Details';
        break;
      case 'load_balancer':
        details = getLoadBalancerDetails(costBreakdown?.breakdown);
        title = 'API & Load Balancing Details';
        break;
      case 'container_management':
        details = getContainerManagementDetails(costBreakdown?.breakdown);
        title = 'Container Management Details';
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
    // Network Data Load Cost
    const networkDataLoadCost = costBreakdown?.breakdown?.pxgrid_cost || 0;
    
    // Network Costs
    const networkCosts = (costBreakdown?.breakdown?.network?.throughput_cost || 0) + 
                        (costBreakdown?.breakdown?.network?.msk_cost || 0);
    
    // Container Cost
    const containerCost = costBreakdown?.breakdown?.container_cost || 0;
    
    // Storage Cost
    const storageCost = storageCosts.dynamodb_final_cost + storageCosts.s3_final_cost;
    
    // Cloud Infrastructure Costs (divided by 12 to get monthly values)
    const cloudInfraCost = ((costBreakdown?.breakdown?.nat_gateway || 0) +
                           (costBreakdown?.breakdown?.vpc_endpoints || 0) +
                           (costBreakdown?.breakdown?.transit_gateway || 0) +
                           (costBreakdown?.breakdown?.route53 || 0)) / 12;
    
    // Infrastructure Management Costs
    const infraManagementCost = ((costBreakdown?.breakdown?.terraform_saas || 0) +
                                (costBreakdown?.breakdown?.gitlab_ci || 0) +
                                (costBreakdown?.breakdown?.slack_seat || 0)) / 12;
    
    // Security Costs
    const securityCost = ((costBreakdown?.breakdown?.security_hub || 0) +
                         (costBreakdown?.breakdown?.waf || 0) +
                         (costBreakdown?.breakdown?.shield_advanced || 0) +
                         (costBreakdown?.breakdown?.guard_duty || 0)) / 12;
    
    // Calculate monitoring costs
    const total_tenants = scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants;
    const endpoints_per_tenant = scaleConfigEnabled ? formData.scale.endpoints_per_tenant : minimalConfig.scale.endpoints_per_tenant;
    const total_endpoints = total_tenants * endpoints_per_tenant;
    
    // Base monitoring costs (annual)
    const base_cloudwatch_metrics = 240; // $20 per month * 12
    const base_cloudwatch_management = 40; // $3.33 per month * 12
    const base_systems_manager = 360; // $30 per month * 12
    const base_prometheus = 600; // $50 per month * 12

    // Use minimal costs when configurations are disabled
    const cloudwatch_metrics = scaleConfigEnabled ? (costBreakdown?.breakdown?.cloudwatch_metrics || base_cloudwatch_metrics) : base_cloudwatch_metrics;
    const cloudwatch_management = scaleConfigEnabled ? (costBreakdown?.breakdown?.cloudwatch_management || base_cloudwatch_management) : base_cloudwatch_management;
    const systems_manager = scaleConfigEnabled ? (costBreakdown?.breakdown?.systems_manager || base_systems_manager) : base_systems_manager;
    const prometheus = scaleConfigEnabled ? (costBreakdown?.breakdown?.managed_prometheus || base_prometheus) : base_prometheus;
    
    // Calculate multipliers
    const metrics_cost_multiplier = scaleConfigEnabled ? Math.max(1, Math.ceil(total_endpoints * 5 / 20000)) : 1;
    const tenant_multiplier = scaleConfigEnabled ? Math.max(1, Math.ceil(total_tenants / 100)) : 1;
    const endpoint_multiplier = scaleConfigEnabled ? Math.max(1, Math.ceil(total_endpoints / 1000)) : 1;
    
    // Calculate final monitoring costs (monthly)
    const monitoringCost = ((cloudwatch_metrics * metrics_cost_multiplier) +
                           cloudwatch_management +
                           (systems_manager * tenant_multiplier) +
                           (prometheus * endpoint_multiplier)) / 12;
    
    // Load Balancer Cost
    const loadBalancerCost = (costBreakdown?.breakdown?.load_balancer_base || 0) / 12;
    
    // Container Management Cost
    const containerManagementCost = ((costBreakdown?.breakdown?.ecr || 0) +
                                   (costBreakdown?.breakdown?.helm_storage || 0) +
                                   (costBreakdown?.breakdown?.ecs_fargate || 0)) / 12;
    
    // Calculate total monthly cost
    const totalMonthlyCost = networkDataLoadCost +
                            networkCosts +
                            containerCost +
                            storageCost +
                            cloudInfraCost +
                            infraManagementCost +
                            securityCost +
                            monitoringCost +
                            loadBalancerCost +
                            containerManagementCost;
    
    return totalMonthlyCost;
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
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleShowDetails('cloud_infra')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">AWS Cloud Infrastructure</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    NAT Gateway: {safeFormatCurrency((costBreakdown?.breakdown?.nat_gateway || 0) / 12)}
                  </Typography>
                  <Typography variant="body2">
                    VPC Endpoints: {safeFormatCurrency((costBreakdown?.breakdown?.vpc_endpoints || 0) / 12)}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Total: {safeFormatCurrency(
                      ((costBreakdown?.breakdown?.nat_gateway || 0) + 
                       (costBreakdown?.breakdown?.vpc_endpoints || 0) +
                       (costBreakdown?.breakdown?.transit_gateway || 0) +
                       (costBreakdown?.breakdown?.route53 || 0)) / 12
                    )}
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
                  onClick={() => handleShowDetails('infra_management')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Infrastructure Management</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    Terraform: {safeFormatCurrency((costBreakdown?.breakdown?.terraform_saas || 0) / 12)}
                  </Typography>
                  <Typography variant="body2">
                    GitLab CI: {safeFormatCurrency((costBreakdown?.breakdown?.gitlab_ci || 0) / 12)}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Total: {safeFormatCurrency(
                      ((costBreakdown?.breakdown?.terraform_saas || 0) +
                       (costBreakdown?.breakdown?.gitlab_ci || 0) +
                       (costBreakdown?.breakdown?.slack_seat || 0)) / 12
                    )}
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
                  onClick={() => handleShowDetails('security')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Security Tools</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    Security Hub: {safeFormatCurrency((costBreakdown?.breakdown?.security_hub || 0) / 12)}
                  </Typography>
                  <Typography variant="body2">
                    Shield Advanced: {safeFormatCurrency((costBreakdown?.breakdown?.shield_advanced || 0) / 12)}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Total: {safeFormatCurrency(
                      ((costBreakdown?.breakdown?.security_hub || 0) +
                       (costBreakdown?.breakdown?.waf || 0) +
                       (costBreakdown?.breakdown?.shield_advanced || 0) +
                       (costBreakdown?.breakdown?.guard_duty || 0)) / 12
                    )}
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
                  onClick={() => handleShowDetails('monitoring')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Monitoring</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    CloudWatch Metrics: {formatCurrency(20)}
                  </Typography>
                  <Typography variant="body2">
                    CloudWatch Management: {formatCurrency(3.333)}
                  </Typography>
                  <Typography variant="body2">
                    Systems Manager: {formatCurrency(30)}
                  </Typography>
                  <Typography variant="body2">
                    Managed Prometheus: {formatCurrency(50)}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Total: {formatCurrency(103.333)}
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
                  onClick={() => handleShowDetails('load_balancer')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">API & Load Balancing</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    API Gateway: {formatCurrency(
                      (networkLoadEnabled ? 
                        (networkLoadConfig.api.calls_per_day * formData.scale.total_tenants * formData.scale.consumers_per_tenant * 30 / 1_000_000 * 100) :
                        (minimalConfig.network_load.api.calls_per_day * minimalConfig.scale.total_tenants * minimalConfig.scale.consumers_per_tenant * 30 / 1_000_000 * 100))
                    )}
                  </Typography>
                  <Typography variant="body2">
                    ALB Base: {formatCurrency(200)}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Total: {formatCurrency(
                      (networkLoadEnabled ? 
                        (networkLoadConfig.api.calls_per_day * formData.scale.total_tenants * formData.scale.consumers_per_tenant * 30 / 1_000_000 * 100) :
                        (minimalConfig.network_load.api.calls_per_day * minimalConfig.scale.total_tenants * minimalConfig.scale.consumers_per_tenant * 30 / 1_000_000 * 100)) + 200
                    )}
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
                  onClick={() => handleShowDetails('container_management')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Container Management</Typography>
                    <InfoIcon color="action" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    ECR: {safeFormatCurrency((costBreakdown?.breakdown?.ecr || 0) / 12)}
                  </Typography>
                  <Typography variant="body2">
                    ECS Fargate: {safeFormatCurrency((costBreakdown?.breakdown?.ecs_fargate || 0) / 12)}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Total: {safeFormatCurrency(
                      ((costBreakdown?.breakdown?.ecr || 0) +
                       (costBreakdown?.breakdown?.helm_storage || 0) +
                       (costBreakdown?.breakdown?.ecs_fargate || 0)) / 12
                    )}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Typography variant="h6">
                    Total {costPeriod.charAt(0).toUpperCase() + costPeriod.slice(1)} Cost: {formatCurrency(getTotalCost())}
                  </Typography>
                  <Typography variant="subtitle1">
                    Cost per Tenant: {formatCurrency(
                      getTotalCost() /
                      (scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants)
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