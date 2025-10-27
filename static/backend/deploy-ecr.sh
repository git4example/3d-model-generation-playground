#!/bin/bash
set -e

# Hardcoded ECR URIs (ECR Public registry)
ECR_REGISTRY="public.ecr.aws/v1g0v6a3"
TRIPOSR_ECR_URI="${ECR_REGISTRY}/triposr-model"
STABLE3DGEN_ECR_URI="${ECR_REGISTRY}/stable3dgen-model"
DIRECT3D_S2_ECR_URI="${ECR_REGISTRY}/direct3d-s2-model"
ASSET_MANAGER_ECR_URI="${ECR_REGISTRY}/asset-manager"
FRONTEND_ECR_URI="${ECR_REGISTRY}/frontend"

# Parse command line arguments
SELECTED_SERVICES=()
AUTO_APPROVE=false
TAG="latest"

# Show examples if no arguments provided
if [ $# -eq 0 ]; then
    echo "=========================================="
    echo "3D Inference Services Deployment (ECR)"
    echo "=========================================="
    echo ""
    echo "Usage: ./deploy-ecr.sh [OPTIONS]"
    echo ""
    echo "Deploy from pre-built images in ECR (skips build/push stages)"
    echo ""
    echo "You must specify what to deploy. Here are some examples:"
    echo ""
    echo "  # Deploy all services with latest tag"
    echo "  ./deploy-ecr.sh --all"
    echo "  ./deploy-ecr.sh --all --yes"
    echo ""
    echo "  # Deploy with specific tag"
    echo "  ./deploy-ecr.sh --all --tag v1.2.3"
    echo "  ./deploy-ecr.sh --all --tag production --yes"
    echo ""
    echo "  # Deploy specific services"
    echo "  ./deploy-ecr.sh --services triposr"
    echo "  ./deploy-ecr.sh --services triposr,frontend --tag v1.0.0"
    echo "  ./deploy-ecr.sh --services triposr,frontend --yes"
    echo ""
    echo "  # Deploy backend services only"
    echo "  ./deploy-ecr.sh --services triposr,stable3dgen,direct3d-s2,asset-manager"
    echo "  ./deploy-ecr.sh --services triposr,stable3dgen,direct3d-s2,asset-manager --tag stable"
    echo ""
    echo "  # Deploy frontend only"
    echo "  ./deploy-ecr.sh --services frontend --tag latest"
    echo "  ./deploy-ecr.sh --services frontend --yes"
    echo ""
    echo "  # Deploy models only"
    echo "  ./deploy-ecr.sh --services triposr,stable3dgen,direct3d-s2 --tag v2.0.0"
    echo ""
    echo "  # Quick deployment with custom tag"
    echo "  ./deploy-ecr.sh --services triposr --tag hotfix-123 --yes"
    echo ""
    echo "Available services:"
    echo "  - triposr          (Fast 3D generation)"
    echo "  - stable3dgen      (High quality)"
    echo "  - direct3d-s2      (Balanced)"
    echo "  - asset-manager    (Gallery & job management)"
    echo "  - frontend         (Web UI)"
    echo ""
    echo "Options:"
    echo "  --all              Deploy all services"
    echo "  --services <list>  Deploy specific services (comma-separated)"
    echo "  --tag <tag>        Image tag to deploy (default: latest)"
    echo "  --yes, -y          Skip confirmation prompts (auto-approve)"
    echo "  --help             Show detailed help with more information"
    echo ""
    echo "ECR Registry: ${ECR_REGISTRY}"
    echo ""
    exit 0
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            shift
            ;;
        --services)
            shift
            IFS=',' read -ra SELECTED_SERVICES <<< "$1"
            shift
            ;;
        --tag)
            shift
            TAG="$1"
            shift
            ;;
        --yes|-y)
            AUTO_APPROVE=true
            shift
            ;;
        --help)
            echo "Usage: ./deploy-ecr.sh [OPTIONS]"
            echo ""
            echo "Deploy from pre-built images in ECR (skips build/push stages)"
            echo ""
            echo "Options:"
            echo "  --all              Deploy all services"
            echo "  --services <list>  Deploy specific services (comma-separated)"
            echo "                     Example: --services triposr,frontend"
            echo "  --tag <tag>        Image tag to deploy (default: latest)"
            echo "  --yes, -y          Skip confirmation prompts (auto-approve)"
            echo "  --help             Show this help message"
            echo ""
            echo "Available services:"
            echo "  - triposr"
            echo "  - stable3dgen"
            echo "  - direct3d-s2"
            echo "  - asset-manager"
            echo "  - frontend"
            echo ""
            echo "Examples:"
            echo "  ./deploy-ecr.sh --all                              # Deploy all with latest tag"
            echo "  ./deploy-ecr.sh --all --tag v1.2.3                 # Deploy all with specific tag"
            echo "  ./deploy-ecr.sh --all --yes                        # Deploy all, skip confirmation"
            echo "  ./deploy-ecr.sh --services triposr --tag stable    # Deploy single service"
            echo "  ./deploy-ecr.sh --services triposr,frontend        # Deploy multiple services"
            echo "  ./deploy-ecr.sh --services triposr,frontend --yes  # Deploy without confirmation"
            echo "  ./deploy-ecr.sh --services frontend --tag prod     # Update frontend only"
            echo "  ./deploy-ecr.sh --services triposr,stable3dgen,direct3d-s2  # All models only"
            echo ""
            echo "ECR Registry: ${ECR_REGISTRY}"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "=========================================="
echo "3D Inference Services Deployment (ECR)"
echo "=========================================="
echo ""

# Cleanup function for signal handling
cleanup() {
    echo ""
    echo "Caught signal, cleaning up background jobs..."
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 1
}

trap cleanup SIGINT SIGTERM

# Check prerequisites (kubectl, helm, aws-cli only - no docker needed)
check_prerequisites() {
    echo "Checking prerequisites..."
    local missing_tools=()
    
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing_tools+=("helm")
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo "ERROR: Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install missing tools:"
        for tool in "${missing_tools[@]}"; do
            case $tool in
                kubectl)
                    echo "  kubectl: https://kubernetes.io/docs/tasks/tools/"
                    ;;
                helm)
                    echo "  Helm: curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
                    ;;
                aws-cli)
                    echo "  AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
                    ;;
            esac
        done
        exit 1
    fi
    
    echo "✓ All prerequisites installed"
}

# Deploy service function
deploy_service() {
    local service=$1
    local ecr_uri=$2
    local tag=$3
    local s3_bucket=$4
    local dynamodb_table=$5
    local aws_region=$6
    local log_file="logs/${service}-deploy.log"
    
    echo "[$service] Deploying with Helm..." | tee "$log_file"
    
    # Determine Helm chart path based on service type
    local helm_chart_path
    if [ "$service" = "frontend" ]; then
        helm_chart_path="../frontend/helm/frontend"
    else
        helm_chart_path="./helm/charts/$service"
    fi
    
    # Build Helm command with appropriate parameters
    local helm_cmd="helm upgrade --install $service $helm_chart_path \
        --set image.repository=\"$ecr_uri\" \
        --set image.tag=\"$tag\""
    
    # Add backend-specific environment variables only for non-frontend services
    if [ "$service" != "frontend" ]; then
        helm_cmd="$helm_cmd \
            --set env.s3Bucket=\"$s3_bucket\" \
            --set env.dynamodbTable=\"$dynamodb_table\" \
            --set env.awsRegion=\"$aws_region\""
    fi
    
    helm_cmd="$helm_cmd \
        --namespace 3d-inferencing \
        --wait --timeout 10m"
    
    if eval $helm_cmd &>>"$log_file"; then
        echo "[$service] Verifying deployment..." | tee -a "$log_file"
        if kubectl rollout status deployment/$service -n 3d-inferencing --timeout=2m &>>"$log_file"; then
            echo "[$service] ✓ Deployment complete" | tee -a "$log_file"
            return 0
        else
            echo "[$service] ⚠ Deployment verification timed out" | tee -a "$log_file"
            return 0
        fi
    else
        echo "[$service] ✗ Deployment failed (see $log_file)" | tee -a "$log_file"
        return 1
    fi
}

check_prerequisites

# If no services selected, deploy all
if [ ${#SELECTED_SERVICES[@]} -eq 0 ]; then
    SELECTED_SERVICES=("triposr" "stable3dgen" "direct3d-s2" "asset-manager" "frontend")
fi

echo ""
echo "Services to deploy: ${SELECTED_SERVICES[*]}"
echo "Image tag: $TAG"
echo "ECR Registry: $ECR_REGISTRY"

# Confirmation prompt (unless auto-approved)
if [ "$AUTO_APPROVE" = false ]; then
    echo ""
    read -p "Continue with deployment? (y/n) [y]: " confirm
    confirm=${confirm:-y}
    
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi
else
    echo ""
    echo "✓ Auto-approved (--yes flag)"
fi

# Validate Terraform state exists
if [ ! -f "../terraform/terraform.tfstate" ]; then
    echo "ERROR: Terraform state not found. Run 'terraform apply' first."
    exit 1
fi

# Get outputs from Terraform with error handling
cd ../terraform
echo ""
echo "Fetching Terraform outputs..."

EKS_CLUSTER=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "")
AWS_REGION=$(terraform output -raw region 2>/dev/null || echo "us-west-2")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
DYNAMODB_TABLE=$(terraform output -raw dynamodb_jobs_table_name 2>/dev/null || echo "")

cd ../backend

# Validate required outputs
if [ -z "$EKS_CLUSTER" ]; then
    echo "ERROR: Could not get EKS cluster name from Terraform"
    exit 1
fi

echo ""
echo "Configuration:"
echo "  EKS Cluster: $EKS_CLUSTER"
echo "  Region: $AWS_REGION"
echo "  S3 Bucket: $S3_BUCKET"
echo "  DynamoDB Table: $DYNAMODB_TABLE"
echo "  Image Tag: $TAG"
echo "  Services: ${SELECTED_SERVICES[*]}"

# Update kubeconfig
echo ""
echo "Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER

# Verify cluster access
echo "Verifying cluster access..."
if ! kubectl cluster-info &>/dev/null; then
    echo "ERROR: Cannot access EKS cluster"
    exit 1
fi

# Verify namespace exists (managed by Terraform)
echo "Verifying namespace exists..."
if ! kubectl get namespace 3d-inferencing &>/dev/null; then
    echo "ERROR: Namespace 3d-inferencing not found"
    echo "The namespace is managed by Terraform. Run 'terraform apply' first to create infrastructure."
    exit 1
fi
echo "✓ Namespace 3d-inferencing exists"

# Create logs directory
mkdir -p logs

# Define services with associative arrays for proper tracking
declare -A SERVICE_ECRS
SERVICE_ECRS["triposr"]="$TRIPOSR_ECR_URI"
SERVICE_ECRS["stable3dgen"]="$STABLE3DGEN_ECR_URI"
SERVICE_ECRS["direct3d-s2"]="$DIRECT3D_S2_ECR_URI"
SERVICE_ECRS["asset-manager"]="$ASSET_MANAGER_ECR_URI"
SERVICE_ECRS["frontend"]="$FRONTEND_ECR_URI"

# Verify selected services are valid
VALID_SERVICES=()
for service in "${SELECTED_SERVICES[@]}"; do
    # Validate ECR URI exists
    if [ -z "${SERVICE_ECRS[$service]}" ]; then
        echo "WARNING: No ECR URI found for $service, skipping"
        continue
    fi
    VALID_SERVICES+=("$service")
done

if [ ${#VALID_SERVICES[@]} -eq 0 ]; then
    echo "ERROR: No valid services selected"
    exit 1
fi

echo ""
echo "=========================================="
echo "Deploying with Helm (Parallel)"
echo "=========================================="
echo "Deploying ${#VALID_SERVICES[@]} services from ECR..."
echo ""

# Deploy all services in parallel
declare -A DEPLOY_PIDS
for service in "${VALID_SERVICES[@]}"; do
    deploy_service "$service" "${SERVICE_ECRS[$service]}" "$TAG" "$S3_BUCKET" "$DYNAMODB_TABLE" "$AWS_REGION" &
    DEPLOY_PIDS[$service]=$!
done

# Wait for all deployments
FAILED_SERVICES=()
for service in "${VALID_SERVICES[@]}"; do
    if ! wait ${DEPLOY_PIDS[$service]}; then
        FAILED_SERVICES+=("$service")
    fi
done

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo "✓ All services deployed successfully!"
    echo ""
    echo "Deployed services: ${VALID_SERVICES[*]}"
    echo "Image Tag: $TAG"
    echo "ECR Registry: $ECR_REGISTRY"
    echo "Logs available in: ./logs/"
    
    # Trigger ALB Ingress reconciliation
    echo ""
    echo "=========================================="
    echo "Triggering ALB Ingress Reconciliation"
    echo "=========================================="
    
    if kubectl get ingress api-ingress -n 3d-inferencing &>/dev/null; then
        echo "Forcing AWS Load Balancer Controller to update ALB rules..."
        
        # Update annotation to trigger reconciliation
        if kubectl annotate ingress api-ingress -n 3d-inferencing \
            alb.ingress.kubernetes.io/target-type=ip --overwrite &>/dev/null; then
            echo "✓ Ingress annotation updated"
            echo ""
            echo "Waiting for ALB to reconcile (this may take 2-3 minutes)..."
            sleep 10
            
            echo ""
            echo "ALB reconciliation triggered successfully!"
            echo ""
            echo "Monitor reconciliation progress:"
            echo "  kubectl describe ingress api-ingress -n 3d-inferencing"
            echo "  kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller --tail=50"
        else
            echo "⚠ Failed to update Ingress annotation"
            echo "Manually trigger reconciliation with:"
            echo "  kubectl annotate ingress api-ingress -n 3d-inferencing alb.ingress.kubernetes.io/target-type=ip --overwrite"
        fi
    else
        echo "⚠ Ingress 'api-ingress' not found in namespace 3d-inferencing"
        echo ""
        echo "This is expected if you haven't run 'terraform apply' yet."
        echo "After running terraform apply, the Ingress will be created automatically."
    fi
    
    echo ""
    echo "=========================================="
    echo "Quick Reference"
    echo "=========================================="
    echo "Check deployment status:"
    echo "  kubectl get pods -n 3d-inferencing"
    echo "  kubectl get svc -n 3d-inferencing"
    echo "  kubectl get ingress -n 3d-inferencing"
    echo ""
    echo "View service logs:"
    for service in "${VALID_SERVICES[@]}"; do
        echo "  kubectl logs -f -n 3d-inferencing -l app=$service"
    done
    echo ""
    echo "View deployment logs:"
    for service in "${VALID_SERVICES[@]}"; do
        echo "  cat logs/${service}-deploy.log"
    done
    echo ""
    echo "Rollback a service:"
    echo "  helm rollback <service-name> -n 3d-inferencing"
    echo ""
    echo "Get CloudFront URL:"
    echo "  cd ../terraform && terraform output cloudfront_url"
else
    echo "✗ Failed services: ${FAILED_SERVICES[*]}"
    echo "Check logs in ./logs/ directory for details:"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "  cat logs/${service}-deploy.log"
    done
    exit 1
fi
