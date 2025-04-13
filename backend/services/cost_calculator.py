from typing import Dict, Any
import json
import os
from pathlib import Path

class CostCalculator:
    def __init__(self):
        # Load default pricing data from JSON files
        self.pricing_data = self._load_pricing_data()
        self.aws_pricing = {
            'dynamodb': {
                'write_request_units': 1.25,  # per million requests
                'read_request_units': 0.25,   # per million requests
                'storage_gb_month': 0.25,     # per GB per month
            },
            's3': {
                'storage_gb_month': 0.023,    # per GB per month
                'put_request': 0.005,         # per 1000 requests
                'get_request': 0.0004,        # per 1000 requests
            },
            'eks': {
                'cluster_hour': 0.10,         # per hour
                'ec2_instances': {
                    't3.medium': 0.0416,      # per hour
                    't3.large': 0.0832,       # per hour
                    't3.xlarge': 0.1664       # per hour
                }
            },
            'network': {
                'data_transfer_gb': 0.09,     # per GB
                'msk': {
                    'broker_hour': 0.21,      # per hour
                    'storage_gb_month': 0.10  # per GB per month
                }
            }
        }
        
        # Region-specific pricing multipliers
        self.region_multipliers = {
            'aws': {
                'us-east-1': 1.0,  # Base pricing (N. Virginia)
                'us-west-2': 1.05,  # Oregon (5% higher)
                'eu-west-1': 1.12,  # Ireland (12% higher)
                'ap-southeast-1': 1.15  # Singapore (15% higher)
            },
            'azure': {
                'eastus': 1.0,  # Base pricing
                'westus2': 1.03,  # 3% higher
                'northeurope': 1.10,  # 10% higher
                'southeastasia': 1.12  # 12% higher
            },
            'gcp': {
                'us-east1': 1.0,  # Base pricing
                'us-west1': 1.04,  # 4% higher
                'europe-west1': 1.08,  # 8% higher
                'asia-southeast1': 1.10  # 10% higher
            }
        }
        
    def _load_pricing_data(self) -> Dict[str, Any]:
        """Load pricing data from JSON files or use defaults if files don't exist."""
        default_pricing = {
            'aws': {
                'pxgrid': {
                    'message_cost_per_million': 9.25,
                    'api_requests_cost': 0.00189  # per request
                },
                'storage': {
                    'dynamodb': {
                        'base_yearly': 60.48,
                        'write_unit': 0.00065,
                        'read_unit': 0.00013
                    },
                    's3': {
                        'standard_storage_per_gb': 0.023,
                        'data_transfer_per_gb': 0.09
                    }
                },
                'container': {
                    'eks': {
                        'base_monthly': 73.0,
                        'ec2_compute_memory': 71.54
                    }
                },
                'network': {
                    'throughput_per_gb': 1.5,
                    'msk': {
                        'broker_cluster_monthly': 101.85,
                        'storage_per_gb': 0.10,
                        'data_transfer_per_gb': 0.02
                    }
                }
            },
            'azure': {
                'pxgrid': {
                    'message_cost_per_million': 9.15,
                    'api_requests_cost': 0.00179
                },
                'storage': {
                    'dynamodb': {
                        'base_yearly': 58.48,
                        'write_unit': 0.00062,
                        'read_unit': 0.00012
                    },
                    's3': {
                        'standard_storage_per_gb': 0.022,
                        'data_transfer_per_gb': 0.087
                    }
                },
                'container': {
                    'eks': {
                        'base_monthly': 71.0,
                        'ec2_compute_memory': 69.54
                    }
                },
                'network': {
                    'throughput_per_gb': 1.4,
                    'msk': {
                        'broker_cluster_monthly': 99.85,
                        'storage_per_gb': 0.09,
                        'data_transfer_per_gb': 0.018
                    }
                }
            },
            'gcp': {
                'pxgrid': {
                    'message_cost_per_million': 9.20,
                    'api_requests_cost': 0.00184
                },
                'storage': {
                    'dynamodb': {
                        'base_yearly': 59.48,
                        'write_unit': 0.00063,
                        'read_unit': 0.00012
                    },
                    's3': {
                        'standard_storage_per_gb': 0.022,
                        'data_transfer_per_gb': 0.088
                    }
                },
                'container': {
                    'eks': {
                        'base_monthly': 72.0,
                        'ec2_compute_memory': 70.54
                    }
                },
                'network': {
                    'throughput_per_gb': 1.45,
                    'msk': {
                        'broker_cluster_monthly': 100.85,
                        'storage_per_gb': 0.095,
                        'data_transfer_per_gb': 0.019
                    }
                }
            }
        }
        
        # Try to load custom pricing data if it exists
        pricing_file = Path(__file__).parent.parent / "data" / "pricing_data.json"
        if pricing_file.exists():
            try:
                with open(pricing_file, "r") as f:
                    loaded_data = json.load(f)
                    # Ensure the loaded data has the required structure
                    for provider in ['aws', 'azure', 'gcp']:
                        if provider not in loaded_data:
                            loaded_data[provider] = default_pricing[provider]
                        else:
                            # Ensure each provider has all required sections
                            for section in ['pxgrid', 'storage', 'container', 'network']:
                                if section not in loaded_data[provider]:
                                    loaded_data[provider][section] = default_pricing[provider][section]
                    return loaded_data
            except Exception as e:
                print(f"Error loading pricing data: {e}")
                return default_pricing
        return default_pricing
    
    def update_pricing_data(self, new_pricing: Dict[str, Any]) -> bool:
        """Update pricing data with custom values."""
        try:
            # Ensure the data directory exists
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            
            # Merge new pricing with existing pricing
            for provider, categories in new_pricing.items():
                if provider in self.pricing_data:
                    for category, values in categories.items():
                        if category in self.pricing_data[provider]:
                            self.pricing_data[provider][category].update(values)
                        else:
                            self.pricing_data[provider][category] = values
                else:
                    self.pricing_data[provider] = categories
            
            # Save updated pricing to file
            pricing_file = data_dir / "pricing_data.json"
            with open(pricing_file, "w") as f:
                json.dump(self.pricing_data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error updating pricing data: {e}")
            return False
        
    def get_region_multiplier(self, provider: str, region: str) -> float:
        """Get the pricing multiplier for a specific region."""
        try:
            print(f"Looking up multiplier for {provider} in region {region}")
            print(f"Available multipliers: {self.region_multipliers}")
            if provider in self.region_multipliers and region in self.region_multipliers[provider]:
                multiplier = self.region_multipliers[provider][region]
                print(f"Found multiplier: {multiplier}")
                return multiplier
            print(f"No multiplier found for {provider} in region {region}, using default 1.0")
            return 1.0
        except Exception as e:
            print(f"Error getting region multiplier: {str(e)}, using default 1.0")
            return 1.0

    def calculate_pxgrid_cost(self, deployment: Dict[str, Any], provider: str) -> float:
        """Calculate PxGrid-related costs including message publishing and API load."""
        try:
            pricing = self.pricing_data[provider]['pxgrid']
            region = deployment.get('region')
            if not region:
                raise ValueError("Region must be specified")
            
            multiplier = self.get_region_multiplier(provider, region)
            
            num_tenants = deployment.get('num_tenants', 1)
            consumers_per_tenant = deployment.get('consumers_per_tenant', 1)
            messages_per_day = deployment.get('messages_per_day', 0)
            api_requests_per_day = deployment.get('api_requests_per_day', 0)
            
            # Calculate monthly message cost
            monthly_messages = messages_per_day * 30 * num_tenants * consumers_per_tenant
            message_cost = (monthly_messages / 1_000_000) * pricing['message_cost_per_million']
            
            # Calculate API request cost
            monthly_api_requests = api_requests_per_day * 30 * num_tenants * consumers_per_tenant
            api_cost = monthly_api_requests * pricing['api_requests_cost']
            
            return message_cost + api_cost
        except KeyError as e:
            raise ValueError(f"Missing pricing data for {provider}: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error calculating PxGrid costs: {str(e)}")

    def calculate_storage_costs(self, deployment, provider):
        """Calculate DynamoDB and S3 costs based on cloud provider"""
        try:
            pricing = self.pricing_data[provider]['storage']
            region = deployment.get('region')
            if not region:
                raise ValueError("Region must be specified")
            
            # DynamoDB calculations
            avg_item_size_kb = 4  # Assuming 4KB per item
            total_items = deployment['num_tenants'] * deployment['endpoints_per_tenant']
            storage_gb = (total_items * avg_item_size_kb) / (1024 * 1024)  # Convert to GB
            
            # Estimate write and read operations
            daily_writes = deployment['messages_per_day'] + deployment['api_requests_per_day']
            daily_reads = daily_writes * 2  # Assuming 2 reads per write
            monthly_writes = daily_writes * 30
            monthly_reads = daily_reads * 30

            dynamodb_cost = (
                (storage_gb * pricing['dynamodb']['base_yearly'] / 12) +
                (monthly_writes * pricing['dynamodb']['write_unit']) +
                (monthly_reads * pricing['dynamodb']['read_unit'])
            )

            # S3 calculations
            s3_storage_gb = deployment['data_per_tenant_gb'] * deployment['num_tenants']
            monthly_s3_puts = deployment['messages_per_day'] * 30
            monthly_s3_gets = monthly_s3_puts * 2  # Assuming 2 reads per write

            s3_cost = (
                (s3_storage_gb * pricing['s3']['standard_storage_per_gb']) +
                (monthly_s3_puts * pricing['s3']['data_transfer_per_gb'] / 1000) +
                (monthly_s3_gets * pricing['s3']['data_transfer_per_gb'] / 1000)
            )

            return {
                'dynamodb_cost': dynamodb_cost,
                's3_cost': s3_cost
            }
        except KeyError as e:
            raise ValueError(f"Missing storage pricing data for {provider}: {str(e)}")

    def calculate_container_costs(self, deployment, provider):
        """Calculate container infrastructure costs based on cloud provider"""
        try:
            pricing = self.pricing_data[provider]['container']['eks']
            region = deployment.get('region')
            if not region:
                raise ValueError("Region must be specified")
            
            # Base cluster cost
            cluster_monthly_cost = pricing['base_monthly']

            # Compute costs based on tenant count
            num_tenants = deployment['num_tenants']
            base_nodes = max(2, num_tenants // 100)  # Minimum 2 nodes
            nodes_for_load = deployment['messages_per_day'] // 1_000_000  # Add node per million messages
            total_nodes = base_nodes + nodes_for_load

            compute_cost = pricing['ec2_compute_memory'] * total_nodes

            return cluster_monthly_cost + compute_cost
        except KeyError as e:
            raise ValueError(f"Missing container pricing data for {provider}: {str(e)}")

    def calculate_network_costs(self, deployment, provider):
        """Calculate network costs based on cloud provider"""
        try:
            pricing = self.pricing_data[provider]['network']
            region = deployment.get('region')
            if not region:
                raise ValueError("Region must be specified")
            
            # Data transfer costs
            daily_data_gb = deployment['data_throughput_gb']
            monthly_data_transfer = daily_data_gb * 30
            data_transfer_cost = monthly_data_transfer * pricing['throughput_per_gb']

            # MSK (Kafka) costs
            num_brokers = max(2, deployment['num_tenants'] // 1000)  # Minimum 2 brokers
            msk_broker_cost = num_brokers * pricing['msk']['broker_cluster_monthly']
            
            # MSK storage for message retention
            message_retention_days = 7
            daily_message_size_gb = (
                deployment['messages_per_day'] * 
                deployment['network_metrics']['message_size_kb'] / 
                (1024 * 1024)
            )
            msk_storage_gb = daily_message_size_gb * message_retention_days
            msk_storage_cost = (
                msk_storage_gb * pricing['msk']['storage_per_gb'] +
                monthly_data_transfer * pricing['msk']['data_transfer_per_gb']
            )

            return {
                'throughput_cost': data_transfer_cost,
                'msk_cost': msk_broker_cost + msk_storage_cost
            }
        except KeyError as e:
            raise ValueError(f"Missing network pricing data for {provider}: {str(e)}")

    def get_total_cost(self, request):
        """Calculate total infrastructure costs"""
        try:
            deployment = request['deployment']
            provider = request['cloud_provider']
            region = request.get('region')
            
            if not region:
                raise ValueError("Region must be specified in the request")
            
            print(f"Calculating costs for provider: {provider}, region: {region}")
            
            if provider not in self.pricing_data:
                raise ValueError(f"Invalid cloud provider: {provider}")
            
            # Get region multiplier
            multiplier = self.get_region_multiplier(provider, region)
            print(f"Using region multiplier: {multiplier}")
            
            # Add region to deployment data for component calculations
            deployment['region'] = region
            
            # Calculate base costs without multiplier
            pxgrid_cost = self.calculate_pxgrid_cost(deployment, provider)
            print(f"Base PxGrid cost: {pxgrid_cost}")
            
            storage_costs = self.calculate_storage_costs(deployment, provider)
            print(f"Base Storage costs: {storage_costs}")
            
            container_cost = self.calculate_container_costs(deployment, provider)
            print(f"Base Container cost: {container_cost}")
            
            network_costs = self.calculate_network_costs(deployment, provider)
            print(f"Base Network costs: {network_costs}")

            # Calculate total base cost
            total_base_cost = (
                pxgrid_cost +
                storage_costs['dynamodb_cost'] +
                storage_costs['s3_cost'] +
                container_cost +
                network_costs['throughput_cost'] +
                network_costs['msk_cost']
            )
            
            print(f"Total cost before region multiplier: {total_base_cost}")
            
            # Apply region multiplier to total cost
            total_cost = total_base_cost * multiplier
            print(f"Final total cost after multiplier: {total_cost}")

            # Calculate cost per tenant with multiplier applied
            monthly_cost_per_tenant = total_cost / deployment['num_tenants'] if deployment['num_tenants'] > 0 else 0

            # Return costs with multiplier applied to each component
            return {
                'total_cost': total_cost,
                'monthly_cost_per_tenant': monthly_cost_per_tenant,
                'breakdown': {
                    'pxgrid_cost': pxgrid_cost * multiplier,
                    'storage': {
                        'dynamodb_cost': storage_costs['dynamodb_cost'] * multiplier,
                        's3_cost': storage_costs['s3_cost'] * multiplier
                    },
                    'container_cost': container_cost * multiplier,
                    'network': {
                        'throughput_cost': network_costs['throughput_cost'] * multiplier,
                        'msk_cost': network_costs['msk_cost'] * multiplier
                    }
                },
                'metadata': {
                    'provider': provider,
                    'region': region,
                    'multiplier': multiplier
                }
            }
        except Exception as e:
            print(f"Error in get_total_cost: {str(e)}")
            raise Exception(f"Error calculating costs: {str(e)}")
        
    def get_pricing_data(self) -> Dict[str, Any]:
        """Return the current pricing data."""
        return self.pricing_data 