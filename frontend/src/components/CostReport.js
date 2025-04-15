import React from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const CostReport = ({
  formData,
  costBreakdown,
  scaleConfigEnabled,
  networkLoadEnabled,
  nodeConfigEnabled,
  defaultNodeConfig,
  minimalConfig,
  networkLoadConfig,
  storageCosts,
  costPeriod
}) => {
  const formatCurrency = (value) => {
    // Convert to number and handle invalid/null/undefined values
    const numValue = Number(value);
    if (isNaN(numValue)) return '$0.00';
    return `$${numValue.toFixed(2)}`;
  };

  const getRegionMultiplier = (region) => {
    const multipliers = {
      'us-east-1': 1.0,
      'us-west-1': 1.2,
      'eu-west-1': 1.15,
      'ap-southeast-1': 1.25,
    };
    return multipliers[region] || 1.0;
  };

  const getNetworkDataLoadCosts = () => {
    const items = [];
    const regionMultiplier = getRegionMultiplier(formData.region);
    
    const eventsPerDay = networkLoadEnabled ? networkLoadConfig.messages.events_per_day : minimalConfig.network_load.messages.events_per_day;
    const totalConsumers = (scaleConfigEnabled ? formData.scale.total_tenants * formData.scale.consumers_per_tenant : 
      minimalConfig.scale.total_tenants * minimalConfig.scale.consumers_per_tenant);
    
    // Calculate message publishing cost
    const messagePublishingCost = (eventsPerDay * totalConsumers / 1000000 * 9.25 * 30);

    // Calculate API cost
    const apiCallsPerDay = networkLoadEnabled ? networkLoadConfig.api.calls_per_day : minimalConfig.network_load.api.calls_per_day;
    const apiCost = (apiCallsPerDay * totalConsumers * 0.00189 * 30);

    items.push({
      category: 'Network & Data Load',
      name: 'Message Publishing',
      baseCost: messagePublishingCost,
      finalCost: messagePublishingCost * regionMultiplier,
      notes: `${eventsPerDay.toLocaleString()} events/day × ${totalConsumers} consumers ÷ 1M × $9.25 × 30 days`
    });

    items.push({
      category: 'Network & Data Load',
      name: 'API Cost',
      baseCost: apiCost,
      finalCost: apiCost * regionMultiplier,
      notes: `${apiCallsPerDay.toLocaleString()} calls/day × ${totalConsumers} consumers × $0.00189 × 30 days`
    });

    return items;
  };

  const getContainerCosts = () => {
    const items = [];
    const regionMultiplier = getRegionMultiplier(formData.region);
    
    const eksBaseCost = 73;
    const totalTenants = scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants;
    const eventsPerDay = networkLoadEnabled ? networkLoadConfig.messages.events_per_day : 1;
    const computeNodes = Math.max(2, Math.floor(totalTenants / 100) + Math.floor(eventsPerDay / 1_000_000));
    const computeCost = 71.54 * computeNodes;

    items.push({
      category: 'Container Infrastructure',
      name: 'EKS Base',
      baseCost: eksBaseCost,
      finalCost: eksBaseCost * regionMultiplier,
      notes: 'Fixed cost for EKS control plane'
    });

    items.push({
      category: 'Container Infrastructure',
      name: 'Compute',
      baseCost: computeCost,
      finalCost: computeCost * regionMultiplier,
      notes: `${computeNodes} nodes (based on ${totalTenants} tenants and ${eventsPerDay.toLocaleString()} events/day) × $71.54/node`
    });

    return items;
  };

  const getCachingCosts = () => {
    const items = [];
    const regionMultiplier = getRegionMultiplier(formData.region);
    const elasticacheNodes = nodeConfigEnabled ? formData.nodes.elasticache_nodes_per_region : defaultNodeConfig.elasticache_nodes_per_region;
    const dynamodbNodes = nodeConfigEnabled ? formData.nodes.dynamodb_nodes : defaultNodeConfig.dynamodb_nodes;

    items.push({
      category: 'Caching & Storage',
      name: 'ElastiCache',
      baseCost: 300 * elasticacheNodes,
      finalCost: 300 * elasticacheNodes * regionMultiplier,
      notes: `${elasticacheNodes} nodes × $300/node`
    });

    items.push({
      category: 'Caching & Storage',
      name: 'DynamoDB Accelerator (DAX)',
      baseCost: 200 * dynamodbNodes,
      finalCost: 200 * dynamodbNodes * regionMultiplier,
      notes: `${dynamodbNodes} nodes × $200/node`
    });

    return items;
  };

  const getStorageCosts = () => {
    const items = [];
    const regionMultiplier = getRegionMultiplier(formData.region);

    items.push({
      category: 'Storage',
      name: 'DynamoDB Storage',
      baseCost: storageCosts.dynamodb_final_cost / regionMultiplier,
      finalCost: storageCosts.dynamodb_final_cost,
      notes: 'Based on configured storage size and throughput'
    });

    items.push({
      category: 'Storage',
      name: 'S3 Storage',
      baseCost: storageCosts.s3_final_cost / regionMultiplier,
      finalCost: storageCosts.s3_final_cost,
      notes: 'Based on configured storage size and access patterns'
    });

    return items;
  };

  const getNetworkCosts = () => {
    const items = [];
    if (costBreakdown?.breakdown?.network) {
      const regionMultiplier = getRegionMultiplier(formData.region);
      
      items.push({
        category: 'Network',
        name: 'Throughput',
        baseCost: costBreakdown.breakdown.network.throughput_cost / regionMultiplier,
        finalCost: costBreakdown.breakdown.network.throughput_cost,
        notes: 'Based on data transfer between regions and internet egress'
      });

      items.push({
        category: 'Network',
        name: 'MSK',
        baseCost: costBreakdown.breakdown.network.msk_cost / regionMultiplier,
        finalCost: costBreakdown.breakdown.network.msk_cost,
        notes: 'Managed Streaming for Apache Kafka costs'
      });
    }
    return items;
  };

  const getCloudInfraCosts = () => {
    const items = [];
    const regionMultiplier = getRegionMultiplier(formData.region);
    
    const costs = [
      { name: 'NAT Gateway', cost: 32, notes: 'One NAT gateway per AZ for outbound traffic' },
      { name: 'VPC Endpoints', cost: 100, notes: 'Interface endpoints for AWS services' },
      { name: 'Transit Gateway', cost: 73, notes: 'For inter-VPC and on-premises connectivity' },
      { name: 'Route 53', cost: 15, notes: 'DNS and health checking services' }
    ];

    costs.forEach(({ name, cost, notes }) => {
      items.push({
        category: 'Cloud Infrastructure',
        name,
        baseCost: cost,
        finalCost: cost * regionMultiplier,
        notes
      });
    });

    return items;
  };

  const getSecurityCosts = () => {
    const items = [];
    
    const costs = [
      { name: 'Security Hub', cost: 80, notes: 'Central security management and compliance monitoring' },
      { name: 'WAF & Shield', cost: 3006, notes: 'Web application firewall and DDoS protection' },
      { name: 'GuardDuty & IAM', cost: 110, notes: 'Threat detection and identity management' },
      { name: 'Secrets & Certs', cost: 73, notes: 'Secrets Manager and certificate management' }
    ];

    costs.forEach(({ name, cost, notes }) => {
      items.push({
        category: 'Security',
        name,
        baseCost: cost,
        finalCost: cost,
        notes
      });
    });

    return items;
  };

  const getMonitoringCosts = () => {
    const items = [];
    
    const costs = [
      { name: 'CloudWatch Metrics', cost: 20, notes: 'Custom metrics and dashboards' },
      { name: 'CloudWatch Management', cost: 3.333, notes: 'Log management and retention' },
      { name: 'Systems Manager', cost: 30, notes: 'Infrastructure management and automation' },
      { name: 'Managed Prometheus', cost: 50, notes: 'Container monitoring and alerting' }
    ];

    costs.forEach(({ name, cost, notes }) => {
      items.push({
        category: 'Monitoring',
        name,
        baseCost: cost,
        finalCost: cost,
        notes
      });
    });

    return items;
  };

  const getLoadBalancerCosts = () => {
    const items = [];
    const regionMultiplier = getRegionMultiplier(formData.region);
    const baseCost = 200.567;

    items.push({
      category: 'API & Load Balancing',
      name: 'Load Balancer',
      baseCost: baseCost,
      finalCost: baseCost * regionMultiplier,
      notes: 'Application Load Balancer with estimated request processing'
    });

    return items;
  };

  const getContainerManagementCosts = () => {
    const items = [];
    const regionMultiplier = getRegionMultiplier(formData.region);
    
    items.push({
      category: 'Container Management',
      name: 'ECR & Helm',
      baseCost: 60,
      finalCost: 60 * regionMultiplier,
      notes: 'Container registry storage and Helm chart repository'
    });

    items.push({
      category: 'Container Management',
      name: 'ECS Fargate',
      baseCost: 40,
      finalCost: 40 * regionMultiplier,
      notes: 'Serverless container orchestration'
    });

    return items;
  };

  const getAllCosts = () => {
    const networkDataLoadCosts = getNetworkDataLoadCosts();
    const storageCosts = getStorageCosts();
    const containerCosts = getContainerCosts();
    const networkCosts = getNetworkCosts();
    const cloudInfraCosts = getCloudInfraCosts();
    const securityCosts = getSecurityCosts();
    const monitoringCosts = getMonitoringCosts();
    const loadBalancerCosts = getLoadBalancerCosts();
    const containerManagementCosts = getContainerManagementCosts();
    const cachingCosts = getCachingCosts();

    return [
      ...networkDataLoadCosts,
      ...storageCosts,
      ...containerCosts,
      ...networkCosts,
      ...cloudInfraCosts,
      ...securityCosts,
      ...monitoringCosts,
      ...loadBalancerCosts,
      ...containerManagementCosts,
      ...cachingCosts
    ];
  };

  const downloadReport = () => {
    const costs = getAllCosts();
    const regionMultiplier = getRegionMultiplier(formData.region);
    
    let csvContent = 'Category,Item,Base Cost,Region Multiplier,Final Cost,Notes\n';
    
    costs.forEach(item => {
      csvContent += `${item.category},${item.name},${item.baseCost},${regionMultiplier},${item.finalCost},${item.notes}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'cost_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTotalCost = () => {
    if (!costBreakdown) return 0;

    const costs = getAllCosts();
    const total = costs.reduce((sum, item) => {
      const itemCost = Number(item.finalCost) || 0;
      return sum + itemCost;
    }, 0);
    
    return total;
  };

  const getCostPerTenant = () => {
    const total = getTotalCost();
    const numTenants = scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants;
    return numTenants > 0 ? total / numTenants : total;
  };

  if (!costBreakdown) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">
          Please calculate costs first using the Calculator tab.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Cost Report ({costPeriod === 'monthly' ? 'Monthly' : 'Yearly'})
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={downloadReport}
        >
          Download Report
        </Button>
      </Box>

      <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="body1">
          Total Cost: {formatCurrency(getTotalCost())} <Typography component="span" color="text.secondary">Monthly total across all services</Typography>
        </Typography>
        <Typography variant="body1">
          Cost per Tenant: {formatCurrency(getCostPerTenant())} <Typography component="span" color="text.secondary">Total cost divided by number of tenants ({scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants})</Typography>
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Item</TableCell>
              <TableCell align="right">Base Cost</TableCell>
              <TableCell align="right">Region Multiplier</TableCell>
              <TableCell align="right">Final Cost</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getAllCosts().map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">{formatCurrency(item.baseCost)}</TableCell>
                <TableCell align="right">{getRegionMultiplier(formData.region)}</TableCell>
                <TableCell align="right">{formatCurrency(item.finalCost)}</TableCell>
                <TableCell>{item.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CostReport; 