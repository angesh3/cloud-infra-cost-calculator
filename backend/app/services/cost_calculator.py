from app.models import (
    LoadParameters, 
    ScaleParameters, 
    CostComponents, 
    CostBreakdown,
    InfrastructureParameters
)

class CostCalculator:
    # Constants from the documentation
    PRICE_PER_MILLION_MESSAGES = 9.25  # $9.25 per million messages
    S3_STORAGE_PRICE = 0.04  # $0.04/M for S3 Standard
    EKS_PRICE = 73  # $73/M
    COMPUTE_MEMORY_PRICE = 71.54  # $71.54/M
    THROUGHPUT_PRICE = 1.5  # $1.5/M3
    MSK_PRICE = 101.85  # $101.85/M for broker-cluster + storage + data-transfer
    
    # Fixed monthly costs
    FIXED_MONTHLY_COST = 3997  # From documentation
    VARIABLE_MONTHLY_COST_PER_TENANT = 2080  # From documentation

    @staticmethod
    def calculate_data_load_costs(
        scale: ScaleParameters,
        load: LoadParameters,
        infra: InfrastructureParameters
    ) -> CostComponents:
        costs = CostComponents()
        
        if load and load.has_load:
            # Calculate PxGrid Load costs (Message publishing and API Load)
            total_messages = (
                load.messages_per_day * 
                scale.consumers_per_tenant * 
                scale.num_tenants * 
                365.25  # Days per year
            )
            messages_millions = total_messages / 1_000_000
            costs.pxgrid_load = messages_millions * CostCalculator.PRICE_PER_MILLION_MESSAGES

            # DynamoDB costs
            costs.dynamodb_storage = 60.48 * scale.num_tenants  # $60.48/Y per tenant

            # S3 Storage
            costs.s3_storage = 0.48 * scale.num_tenants  # $0.48/Y per tenant

            # EKS costs
            costs.eks_orchestration = CostCalculator.EKS_PRICE * 12  # Yearly cost

            # Compute & Memory
            costs.compute_memory = CostCalculator.COMPUTE_MEMORY_PRICE * 12 * scale.num_tenants

            # Throughput
            costs.throughput = CostCalculator.THROUGHPUT_PRICE * 12 * scale.num_tenants

            # MSK (Kafka) costs
            costs.messaging_mks = CostCalculator.MSK_PRICE * 12 * scale.num_tenants

        return costs

    @staticmethod
    def calculate_infrastructure_costs(
        scale: ScaleParameters,
        infra: InfrastructureParameters
    ) -> CostComponents:
        costs = CostComponents()
        
        # Fixed yearly costs
        costs.aws_cloud_infra = (
            infra.cloud_infra.nat_gateway +
            infra.cloud_infra.vpc_endpoints +
            infra.cloud_infra.transit_gateway +
            infra.cloud_infra.route53
        ) * 12

        costs.infrastructure_management = (
            infra.infra_management.terraform_s3 +
            infra.infra_management.terraform_dynamodb +
            infra.infra_management.cicd_pipeline +
            infra.infra_management.multi_region_deployment
        ) * 12

        costs.security_tools = (
            infra.security.security_hub +
            infra.security.waf +
            infra.security.shield_advanced +
            infra.security.guard_duty +
            infra.security.secrets_manager +
            infra.security.certificate_management +
            infra.security.access_management
        ) * 12

        # Variable yearly costs that scale with tenant count
        base_monitoring = (
            infra.monitoring.cloudwatch_metrics +
            infra.monitoring.cloudwatch_logs +
            infra.monitoring.cloudwatch_alarms +
            infra.monitoring.systems_manager +
            infra.monitoring.xray +
            infra.monitoring.managed_prometheus +
            infra.monitoring.grafana +
            infra.monitoring.opensearch
        )
        costs.monitoring = base_monitoring * 12 * scale.num_tenants

        # API & Load Balancing costs
        base_api_cost = (
            infra.load_balancing.api_gateway_per_million +
            infra.load_balancing.load_balancer_base
        )
        costs.api_load_balancing = base_api_cost * 12 * scale.num_tenants

        # Caching costs
        base_caching = (
            infra.caching.elasticache_redis +
            infra.caching.dynamodb_accelerator
        )
        costs.caching = base_caching * 12 * scale.num_tenants

        # Container management (fixed yearly cost)
        costs.container_management = (
            infra.container.ecr_helm_storage +
            infra.container.chart_museum
        ) * 12

        return costs

    @staticmethod
    def calculate_total_costs(
        scale: ScaleParameters,
        load: LoadParameters = None,
        infra: InfrastructureParameters = None
    ) -> CostBreakdown:
        if load is None:
            load = LoadParameters()
        if infra is None:
            infra = InfrastructureParameters()

        data_load_costs = CostCalculator.calculate_data_load_costs(scale, load, infra)
        infrastructure_costs = CostCalculator.calculate_infrastructure_costs(scale, infra)

        # Calculate total monthly costs
        total_monthly_cost = (
            sum([
                data_load_costs.pxgrid_load,
                data_load_costs.dynamodb_storage,
                data_load_costs.s3_storage,
                data_load_costs.eks_orchestration,
                data_load_costs.compute_memory,
                data_load_costs.throughput,
                data_load_costs.messaging_mks,
                infrastructure_costs.aws_cloud_infra,
                infrastructure_costs.infrastructure_management,
                infrastructure_costs.security_tools,
                infrastructure_costs.monitoring,
                infrastructure_costs.api_load_balancing,
                infrastructure_costs.caching,
                infrastructure_costs.container_management
            ]) / 12  # Convert yearly costs to monthly
        )

        total_yearly_cost = total_monthly_cost * 12
        cost_per_tenant = total_yearly_cost / scale.num_tenants if scale.num_tenants > 0 else 0

        # Create detailed breakdown
        detailed_breakdown = {
            "PxGrid Load": data_load_costs.pxgrid_load,
            "DynamoDB Storage": data_load_costs.dynamodb_storage,
            "S3 Storage": data_load_costs.s3_storage,
            "EKS Orchestration": data_load_costs.eks_orchestration,
            "Compute & Memory": data_load_costs.compute_memory,
            "Network Throughput": data_load_costs.throughput,
            "Messaging (MSK)": data_load_costs.messaging_mks,
            "AWS Cloud Infrastructure": infrastructure_costs.aws_cloud_infra,
            "Infrastructure Management": infrastructure_costs.infrastructure_management,
            "Security Tools": infrastructure_costs.security_tools,
            "Monitoring": infrastructure_costs.monitoring,
            "API & Load Balancing": infrastructure_costs.api_load_balancing,
            "Caching": infrastructure_costs.caching,
            "Container Management": infrastructure_costs.container_management
        }

        return CostBreakdown(
            data_load_costs=data_load_costs,
            infrastructure_costs=infrastructure_costs,
            total_monthly_cost=total_monthly_cost,
            total_yearly_cost=total_yearly_cost,
            cost_per_tenant=cost_per_tenant,
            detailed_breakdown=detailed_breakdown
        ) 