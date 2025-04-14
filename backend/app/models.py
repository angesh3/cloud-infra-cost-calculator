from pydantic import BaseModel
from typing import Optional, List, Dict

class CloudInfraParams(BaseModel):
    nat_gateway: float = 32.0
    vpc_endpoints: float = 100.0
    transit_gateway: float = 73.0
    route53: float = 15.0

class InfraManagementParams(BaseModel):
    terraform_s3: float = 3.0
    terraform_dynamodb: float = 2.0
    cicd_pipeline: float = 51.0
    multi_region_deployment: float = 222.0

class SecurityParams(BaseModel):
    security_hub: float = 80.0
    waf: float = 6.0
    shield_advanced: float = 3000.0
    guard_duty: float = 100.0
    secrets_manager: float = 40.0
    certificate_management: float = 33.0
    access_management: float = 10.0

class MonitoringParams(BaseModel):
    cloudwatch_metrics: float = 200.0
    cloudwatch_logs: float = 300.0
    cloudwatch_alarms: float = 50.0
    systems_manager: float = 30.0
    xray: float = 50.0
    managed_prometheus: float = 200.0
    grafana: float = 90.0
    opensearch: float = 200.0

class LoadBalancingParams(BaseModel):
    api_gateway_per_million: float = 100.0
    load_balancer_base: float = 200.0

class CachingParams(BaseModel):
    elasticache_redis: float = 300.0  # 2 nodes across regions
    dynamodb_accelerator: float = 200.0  # Per node

class ContainerParams(BaseModel):
    ecr_helm_storage: float = 30.0
    chart_museum: float = 100.0

class LoadParameters(BaseModel):
    messages_per_day: int = 100010  # Default from documentation
    api_requests_per_day: int = 189  # Default from documentation
    has_load: bool = True
    messages_per_endpoint: int = 10  # Default from documentation

class ScaleParameters(BaseModel):
    num_tenants: int
    consumers_per_tenant: int = 3  # Default from documentation
    endpoints_per_tenant: int = 10000  # Default from documentation
    region: str = "us-west-2"  # Oregon by default

class InfrastructureParameters(BaseModel):
    cloud_infra: CloudInfraParams = CloudInfraParams()
    infra_management: InfraManagementParams = InfraManagementParams()
    security: SecurityParams = SecurityParams()
    monitoring: MonitoringParams = MonitoringParams()
    load_balancing: LoadBalancingParams = LoadBalancingParams()
    caching: CachingParams = CachingParams()
    container: ContainerParams = ContainerParams()

class CostComponents(BaseModel):
    # Data & Load Cost Components
    pxgrid_load: float = 0  # Message publishing and API Load
    dynamodb_storage: float = 0
    s3_storage: float = 0
    eks_orchestration: float = 0
    compute_memory: float = 0
    throughput: float = 0
    messaging_mks: float = 0
    
    # AWS Cloud Infrastructure Components
    nat_gateway: float = 32 * 12  # $32/month
    vpc_endpoints: float = 10 * 12  # $10/month
    transit_gateway: float = 3 * 12  # $3/month
    route53: float = 15 * 12  # $15/month
    
    # Infrastructure Management Components
    terraform_saas: float = 12 * 12  # $12/month
    gitlab_ci: float = 21 * 12  # $21/month
    slack_seat: float = 2 * 12  # $2/month
    
    # Security Tools Components
    security_hub: float = 40 * 12  # $40/month
    waf: float = 25 * 12  # $25/month
    shield_advanced: float = 300 * 12  # $300/month
    guard_duty: float = 12 * 12  # $12/month
    
    # Monitoring Components
    cloudwatch_metrics: float = 20 * 12  # $20/month for 20K metrics
    cloudwatch_management: float = 3.33 * 12  # $3.33/month
    systems_manager: float = 30 * 12  # $30/month
    managed_prometheus: float = 50 * 12  # $50/month
    
    # API & Load Balancing Components
    load_balancer_base: float = 100 * 12  # $100/month base cost
    
    # Container Management Components
    ecr: float = 50 * 12  # $50/month
    helm_storage: float = 10 * 12  # $10/month
    ecs_fargate: float = 40 * 12  # $40/month

class CostCalculationRequest(BaseModel):
    scale_params: ScaleParameters
    load_params: Optional[LoadParameters]
    infra_params: Optional[InfrastructureParameters]

class CostBreakdown(BaseModel):
    data_load_costs: CostComponents
    infrastructure_costs: CostComponents
    total_monthly_cost: float
    total_yearly_cost: float
    cost_per_tenant: float
    detailed_breakdown: Dict[str, float] 