from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uvicorn
from services.cost_calculator import CostCalculator

app = FastAPI(
    title="Cloud Infrastructure Cost Calculator",
    description="API for calculating cloud infrastructure costs",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class DeploymentConfig(BaseModel):
    num_tenants: int
    consumers_per_tenant: int
    messages_per_day: int
    api_requests_per_day: int
    data_throughput_gb: float
    data_per_tenant_gb: float
    has_load: bool

class StorageCosts(BaseModel):
    dynamodb_cost: float
    s3_cost: float

class NetworkCosts(BaseModel):
    throughput_cost: float
    msk_cost: float

class CostBreakdownDetail(BaseModel):
    pxgrid_cost: float
    storage: StorageCosts
    container_cost: float
    network: NetworkCosts

class CostBreakdown(BaseModel):
    total_cost: float
    monthly_cost_per_tenant: float
    breakdown: CostBreakdownDetail

class ScaleParameters(BaseModel):
    consumers_per_tenant: int = Field(
        default=3,
        description="Number of cloud consumers per tenant",
        ge=1
    )
    total_tenants: int = Field(
        default=5000,
        description="Total number of tenants",
        ge=1
    )
    endpoints_per_tenant: int = Field(
        default=10000,
        description="Total number of endpoints per tenant",
        ge=1
    )

class NetworkLoadConfig(BaseModel):
    api: Dict[str, float] = {
        "calls_per_day": 189,
        "request_size_mb": 1.076
    }
    messages: Dict[str, float] = {
        "events_per_day": 100010,
        "message_size_kb": 1
    }

class CostCalculationRequest(BaseModel):
    """Request model for cost calculation."""
    scale: ScaleParameters
    cloud_provider: str = Field(..., description="Cloud provider (aws, azure, gcp)")
    region: str = Field(..., description="Region ID (e.g., us-east-1, eu-west-1)")
    network_load: Optional[NetworkLoadConfig] = None

    @validator('cloud_provider')
    def validate_cloud_provider(cls, v):
        valid_providers = ['aws', 'azure', 'gcp']
        if v.lower() not in valid_providers:
            raise ValueError(f"Invalid cloud provider. Must be one of: {', '.join(valid_providers)}")
        return v.lower()

    @validator('region')
    def validate_region(cls, v, values):
        if 'cloud_provider' not in values:
            return v
            
        provider = values['cloud_provider']
        valid_regions = {
            'aws': ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
            'azure': ['eastus', 'westus2', 'northeurope', 'southeastasia'],
            'gcp': ['us-east1', 'us-west1', 'europe-west1', 'asia-southeast1']
        }
        
        if v not in valid_regions[provider]:
            raise ValueError(f"Invalid region for {provider}. Must be one of: {', '.join(valid_regions[provider])}")
        return v

class ConsumerInteraction(BaseModel):
    pattern: str  # Publish-Subscribe or Request-Response
    num_consumers: int
    data_distribution_volume: float  # GB/month
    request_count: int  # per day

class ComputeResources(BaseModel):
    instances: int

class StorageRequirements(BaseModel):
    persistent_gb: float
    backup_gb: float

class CloudInfrastructure(BaseModel):
    environment: str  # dev, staging, prod
    region: str
    compute_resources: ComputeResources
    storage_requirements: StorageRequirements
    additional_services: List[str]

class PricingUpdateRequest(BaseModel):
    pricing_data: Dict[str, Any]

@app.get("/")
async def root():
    return {"message": "Welcome to Cloud Infrastructure Cost Calculator API"}

@app.post("/calculate-cost")
async def calculate_cost(request: CostCalculationRequest):
    """Calculate infrastructure costs based on scale parameters."""
    try:
        calculator = CostCalculator()
        
        # Use network load configuration if provided, otherwise use defaults
        network_config = request.network_load or NetworkLoadConfig()
        
        # Calculate total daily API calls and data
        total_api_calls = (
            network_config.api["calls_per_day"] * 
            request.scale.consumers_per_tenant * 
            request.scale.total_tenants
        )
        total_api_data_gb = (
            total_api_calls * 
            network_config.api["request_size_mb"] / 
            1024  # Convert MB to GB
        )

        # Calculate total daily message events and data
        total_message_events = (
            network_config.messages["events_per_day"] * 
            request.scale.consumers_per_tenant * 
            request.scale.total_tenants
        )
        total_message_data_gb = (
            total_message_events * 
            network_config.messages["message_size_kb"] / 
            (1024 * 1024)  # Convert KB to GB
        )

        # Convert the request to the format expected by the calculator
        calc_request = {
            'cloud_provider': request.cloud_provider.lower(),
            'region': request.region,  # Include region in the request
            'deployment': {
                'num_tenants': request.scale.total_tenants,
                'consumers_per_tenant': request.scale.consumers_per_tenant,
                'endpoints_per_tenant': request.scale.endpoints_per_tenant,
                'messages_per_day': total_message_events,
                'api_requests_per_day': total_api_calls,
                'data_throughput_gb': total_api_data_gb + total_message_data_gb,
                'data_per_tenant_gb': (total_api_data_gb + total_message_data_gb) / request.scale.total_tenants,
                'has_load': True,
                'region': request.region,  # Also include region in deployment
                'network_metrics': {
                    'api_calls_per_day': network_config.api["calls_per_day"],
                    'api_request_size_mb': network_config.api["request_size_mb"],
                    'events_per_day': network_config.messages["events_per_day"],
                    'message_size_kb': network_config.messages["message_size_kb"],
                    'total_api_data_gb': total_api_data_gb,
                    'total_message_data_gb': total_message_data_gb
                }
            }
        }
        
        return calculator.get_total_cost(calc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/providers")
async def get_providers():
    return {
        "providers": ["aws", "azure", "gcp"],
        "regions": {
            "aws": ["us-east-1", "us-west-2", "eu-west-1"],
            "azure": ["eastus", "westeurope", "southeastasia"],
            "gcp": ["us-central1", "europe-west1", "asia-east1"]
        }
    }

@app.get("/pricing")
async def get_pricing():
    """Get current pricing data for all providers."""
    calculator = CostCalculator()
    return calculator.get_pricing_data()

@app.post("/pricing")
async def update_pricing(pricing_data: Dict[str, Any]):
    """Update pricing data."""
    try:
        calculator = CostCalculator()
        success = calculator.update_pricing_data(pricing_data)
        if success:
            return {"message": "Pricing data updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update pricing data")
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 