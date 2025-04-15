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
  Typography,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const RegionReport = ({
  formData,
  costBreakdown,
  scaleConfigEnabled,
  networkLoadEnabled,
  nodeConfigEnabled,
  defaultNodeConfig,
  minimalConfig,
  networkLoadConfig,
  storageCosts,
  costPeriod,
  totalRegions
}) => {
  const formatCurrency = (amount) => {
    try {
      // Handle undefined, null, or NaN values
      const validAmount = Number(amount) || 0;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(validAmount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '$0.00';
    }
  };

  const regions = [
    { id: 'us-east-1', name: 'US East (N. Virginia)', multiplier: 1.0 },
    { id: 'us-west-2', name: 'US West (Oregon)', multiplier: 1.05 },
    { id: 'eu-west-1', name: 'EU (Ireland)', multiplier: 1.12 },
    { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', multiplier: 1.15 }
  ];

  const getRegionalCosts = (region) => {
    const multiplier = region.multiplier;
    
    // Regional components that scale with region multiplier
    const regionalCosts = {
      caching: {
        elastiCache: 300 * (nodeConfigEnabled ? formData.nodes.elasticache_nodes_per_region : defaultNodeConfig.elasticache_nodes_per_region),
        dynamoDBAccelerator: 200 * (nodeConfigEnabled ? formData.nodes.dynamodb_nodes : defaultNodeConfig.dynamodb_nodes)
      },
      loadBalancer: 200.567,
      cloudInfra: {
        natGateway: 32,
        vpcEndpoints: 100,
        transitGateway: 73,
        route53: 15
      },
      container: {
        eksBase: 73,
        compute: 71.54 * Math.max(2, Math.floor((scaleConfigEnabled ? formData.scale.total_tenants : minimalConfig.scale.total_tenants) / 100))
      },
      containerManagement: {
        ecr: 60,
        ecs: 40
      }
    };

    // Calculate costs with region multiplier
    const costs = {
      caching: {
        elastiCache: regionalCosts.caching.elastiCache * multiplier,
        dynamoDBAccelerator: regionalCosts.caching.dynamoDBAccelerator * multiplier,
        total: (regionalCosts.caching.elastiCache + regionalCosts.caching.dynamoDBAccelerator) * multiplier
      },
      loadBalancer: regionalCosts.loadBalancer * multiplier,
      cloudInfra: {
        natGateway: regionalCosts.cloudInfra.natGateway * multiplier,
        vpcEndpoints: regionalCosts.cloudInfra.vpcEndpoints * multiplier,
        transitGateway: regionalCosts.cloudInfra.transitGateway * multiplier,
        route53: regionalCosts.cloudInfra.route53 * multiplier,
        total: (regionalCosts.cloudInfra.natGateway + regionalCosts.cloudInfra.vpcEndpoints + 
                regionalCosts.cloudInfra.transitGateway + regionalCosts.cloudInfra.route53) * multiplier
      },
      container: {
        eksBase: regionalCosts.container.eksBase * multiplier,
        compute: regionalCosts.container.compute * multiplier,
        total: (regionalCosts.container.eksBase + regionalCosts.container.compute) * multiplier
      },
      containerManagement: {
        ecr: regionalCosts.containerManagement.ecr * multiplier,
        ecs: regionalCosts.containerManagement.ecs * multiplier,
        total: (regionalCosts.containerManagement.ecr + regionalCosts.containerManagement.ecs) * multiplier
      }
    };

    const totalRegionalCost = 
      costs.caching.total +
      costs.loadBalancer +
      costs.cloudInfra.total +
      costs.container.total +
      costs.containerManagement.total;

    return { costs, totalRegionalCost };
  };

  // Global costs that don't scale with regions
  const getGlobalCosts = () => {
    return {
      security: {
        securityHub: 80,
        wafShield: 3006,
        guardDuty: 110,
        secrets: 73,
        total: 3269
      },
      monitoring: {
        cloudWatch: 20,
        cloudWatchManagement: 3.333,
        systemsManager: 30,
        prometheus: 50,
        total: 103.333
      }
    };
  };

  const downloadRegionReport = () => {
    let csvContent = 'Region,Category,Component,Cost,Multiplier,Total Cost\n';
    
    regions.slice(0, totalRegions).forEach(region => {
      const { costs } = getRegionalCosts(region);
      
      // Add regional costs
      Object.entries(costs).forEach(([category, categoryData]) => {
        if (typeof categoryData === 'object') {
          Object.entries(categoryData).forEach(([component, cost]) => {
            if (component !== 'total') {
              csvContent += `${region.name},${category},${component},${cost / region.multiplier},${region.multiplier},${cost}\n`;
            }
          });
        } else {
          csvContent += `${region.name},${category},total,${categoryData / region.multiplier},${region.multiplier},${categoryData}\n`;
        }
      });
    });

    // Add global costs
    const globalCosts = getGlobalCosts();
    Object.entries(globalCosts).forEach(([category, categoryData]) => {
      Object.entries(categoryData).forEach(([component, cost]) => {
        if (component !== 'total') {
          csvContent += `Global,${category},${component},${cost},1.0,${cost}\n`;
        }
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'regional_cost_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateTotalCost = () => {
    try {
      // Calculate costs for each selected region
      const regionalCostsTotal = regions
        .slice(0, totalRegions || 1)
        .reduce((total, region) => {
          const { totalRegionalCost } = getRegionalCosts(region);
          return total + (totalRegionalCost || 0);
        }, 0);

      // Add global costs
      const globalCosts = getGlobalCosts();
      const globalCostsTotal = (globalCosts.security.total || 0) + (globalCosts.monitoring.total || 0);

      // Add storage and networking costs
      const additionalCosts = {
        storage: storageCosts?.total || 0,
        networking: networkLoadEnabled ? 
          ((networkLoadConfig?.egress_gb_month || 0) * 0.09) + ((networkLoadConfig?.ingress_gb_month || 0) * 0.01) : 0
      };

      const totalBeforeSupport = regionalCostsTotal + globalCostsTotal + 
        additionalCosts.storage + additionalCosts.networking;

      // Support cost is 10% of total cost or minimum $100
      const supportCost = Math.max(100, totalBeforeSupport * 0.1);

      return totalBeforeSupport + supportCost;
    } catch (error) {
      console.error('Error calculating total cost:', error);
      return 0;
    }
  };

  const calculateRegionalCosts = () => {
    try {
      // Calculate costs for each region
      const baseRegion = regions.find(r => r.id === formData?.region) || regions[0];
      const { costs: baseCosts } = getRegionalCosts(baseRegion);
      const globalCosts = getGlobalCosts();

      // Calculate total regional costs using actual calculations
      const regionalCosts = {
        caching: baseCosts.caching.total || 0,
        loadBalancing: baseCosts.loadBalancer || 0,
        securityTools: globalCosts.security.total || 0,
        cloudInfra: baseCosts.cloudInfra.total || 0,
        container: baseCosts.container.total || 0
      };

      // Calculate global infrastructure costs
      const globalInfraCosts = {
        infrastructureManagement: 278.00,  // Fixed infrastructure management cost
        containerManagement: 100.00   // Fixed container management cost
      };

      // Non-regional costs
      const nonRegionalCosts = {
        storage: (storageCosts?.dynamodb_final_cost || 0) + (storageCosts?.s3_final_cost || 0),
        networkDataLoad: networkLoadEnabled && networkLoadConfig ? 
          ((networkLoadConfig.messages.events_per_day || 0) * 
          (scaleConfigEnabled ? formData.scale.total_tenants * formData.scale.consumers_per_tenant : 
          minimalConfig.scale.total_tenants * minimalConfig.scale.consumers_per_tenant) / 1000000 * 9.25 * 30 +
          (networkLoadConfig.api.calls_per_day || 0) * 
          (scaleConfigEnabled ? formData.scale.total_tenants * formData.scale.consumers_per_tenant : 
          minimalConfig.scale.total_tenants * minimalConfig.scale.consumers_per_tenant) * 0.00189 * 30) : 0,
        networking: (costBreakdown?.breakdown?.network?.throughput_cost || 0) + (costBreakdown?.breakdown?.network?.msk_cost || 0),
        monitoring: globalCosts.monitoring.total || 0
      };

      const totalRegionalCost = Object.values(regionalCosts).reduce((a, b) => (a || 0) + (b || 0), 0);
      const totalNonRegionalCost = Object.values(nonRegionalCosts).reduce((a, b) => (a || 0) + (b || 0), 0);

      return {
        regionalCosts,
        globalInfraCosts,
        nonRegionalCosts,
        totalRegionalCost,
        totalNonRegionalCost,
        grandTotal: totalRegionalCost + totalNonRegionalCost
      };
    } catch (error) {
      console.error('Error calculating regional costs:', error);
      return {
        regionalCosts: { caching: 0, loadBalancing: 0, securityTools: 0, cloudInfra: 0, container: 0 },
        globalInfraCosts: { infrastructureManagement: 0, containerManagement: 0 },
        nonRegionalCosts: { storage: 0, networkDataLoad: 0, networking: 0, monitoring: 0 },
        totalRegionalCost: 0,
        totalNonRegionalCost: 0,
        grandTotal: 0
      };
    }
  };

  const calculateComponentTotal = (costs) => {
    // Regional costs (multiplied by number of regions)
    const regionalSum = (
      (costs.regionalCosts.caching || 0) +
      (costs.regionalCosts.loadBalancing || 0) +
      (costs.regionalCosts.securityTools || 0) +
      (costs.regionalCosts.cloudInfra || 0)
    );

    // Container costs
    const containerCosts = costs.regionalCosts.container || 0;

    // Global infrastructure costs
    const globalInfraSum = (
      (costs.globalInfraCosts.infrastructureManagement || 0) +
      (costs.globalInfraCosts.containerManagement || 0)
    );

    // Non-region-specific costs
    const nonRegionalSum = (
      (costs.nonRegionalCosts.storage || 0) +
      (costs.nonRegionalCosts.networkDataLoad || 0) +
      (costs.nonRegionalCosts.networking || 0) +
      (costs.nonRegionalCosts.monitoring || 0)
    );

    const componentTotal = (regionalSum * totalRegions) + globalInfraSum + nonRegionalSum + containerCosts;
    console.log('Component-wise Total Calculation:');
    console.log('Regional Costs:', regionalSum);
    console.log('Container Costs:', containerCosts);
    console.log('Global Infrastructure:', globalInfraSum);
    console.log('Non-Regional Costs:', nonRegionalSum);
    console.log('Total:', componentTotal);
    
    return componentTotal;
  };

  const costs = calculateRegionalCosts();
  if (!costs) return null;

  const componentTotal = calculateComponentTotal(costs);
  const currentTotal = costs.totalRegionalCost + costs.totalNonRegionalCost;

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
          Regional Cost Report ({costPeriod === 'monthly' ? 'Monthly' : 'Yearly'})
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={downloadRegionReport}
        >
          Download Regional Report
        </Button>
      </Box>

      {/* <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Total Cost Across {totalRegions} Region{totalRegions > 1 ? 's' : ''}: {formatCurrency(calculateTotalCost())}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Includes region-specific costs and global services
        </Typography>
      </Box> */}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration Summary
              </Typography>
              <Typography>
                Cloud Provider: {formData.cloud_provider}
                <br />
                Base Region: {formData.region}
                <br />
                Total Regions: {totalRegions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cost Component</TableCell>
                  <TableCell align="right">Per Region Cost</TableCell>
                  <TableCell align="right">Total Cost ({totalRegions} regions)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="subtitle1">Region-Specific Costs</Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Caching</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.caching )}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.caching * totalRegions)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>API & Load Balancing</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.loadBalancing )}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.loadBalancing * totalRegions)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Security Tools</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.securityTools )}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.securityTools * totalRegions)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cloud Infrastructure</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.cloudInfra )}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.cloudInfra * totalRegions)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Containers</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.container)}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.regionalCosts.container * totalRegions)}</TableCell>
                </TableRow>

                {/* Global Infra Costs Section */}
                <TableRow>
                  <TableCell colSpan={3} sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                    Global Infra Costs (Global)
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>Infrastructure Management</TableCell>
                  <TableCell align="right">{formatCurrency(costs.globalInfraCosts.infrastructureManagement)}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.globalInfraCosts.infrastructureManagement)}</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>Container Management</TableCell>
                  <TableCell align="right">{formatCurrency(costs.globalInfraCosts.containerManagement)}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.globalInfraCosts.containerManagement)}</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="subtitle1">Non-Region-Specific Costs</Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Storage</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.storage)}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.storage)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Network Data Load</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.networkDataLoad)}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.networkDataLoad)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Network Cost</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.networking)}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.networking)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Monitoring</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.monitoring)}</TableCell>
                  <TableCell align="right">{formatCurrency(costs.nonRegionalCosts.monitoring)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Total Cost</strong></TableCell>
                  <TableCell align="right">
                    <strong>
                      {formatCurrency((costs.totalRegionalCost) + costs.totalNonRegionalCost + costs.globalInfraCosts.infrastructureManagement + costs.globalInfraCosts.containerManagement)}
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(componentTotal)}</strong>
                    {/* {Math.abs(componentTotal - currentTotal) > 0.01 && (
                      <Typography color="error" variant="caption" display="block">
                        Note: Calculation difference detected
                      </Typography>
                    )} */}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RegionReport; 