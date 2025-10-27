#!/bin/bash
set -e

# Parse command line arguments
SELECTED_SERVICES=()
AUTO_APPROVE=false

# Show examples if no arguments provided
if [ $# -eq 0 ]; then
    echo "=========================================="
    echo "3D Inference Services Deployment"
    echo "=========================================="
    echo ""
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "You must specify what to deploy. Here are some examples:"
    echo ""
    echo "  # Deploy all services"
    echo "  ./deploy.sh --all"
    echo "  ./deploy.sh --all --yes"
    echo ""
    echo "  # Deploy specific services"
    echo "  ./deploy.sh --services triposr"
    echo "  ./deploy.sh --services triposr,frontend"
    echo "  ./deploy.sh --services triposr,frontend --yes"
    echo ""
    echo "  # Deploy backend services only"
    echo "  ./deploy.sh --services triposr,stable3dgen,direct3d-s2,asset-manager"
    echo "  ./deploy.sh --services triposr,stable3dgen,direct3d-s2,asset-manager --yes"
    echo ""
    echo "  # Deploy frontend only"
    echo "  ./deploy.sh --services frontend"
    echo "  ./deploy.sh --services frontend --yes"
    echo ""
    echo "  # Deploy models only (no asset-manager or frontend)"
    echo "  ./deploy.sh --services triposr,stable3dgen,direct3d-s2"
    echo "  ./deploy.sh --services triposr,stable3dgen,direct3d-s2 -y"
    echo ""
    echo "  # Quick redeploy after code changes"
    echo "  ./deploy.sh --services triposr --yes"
    echo ""
    echo "  # Deploy new service combination"
    echo "  ./deploy.sh --services stable3dgen,asset-manager,frontend"
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
    echo "  --yes, -y          Skip confirmation prompts (auto-approve)"
    echo "  --help             Show detailed help with more information"
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
        --yes|-y)
            AUTO_APPROVE=true
            shift
            ;;
        --help)
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --all              Deploy all services (non-interactive)"
            echo "  --services <list>  Deploy specific services (comma-separated)"
            echo "                     Example: --services triposr,frontend"
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
            echo "Interactive mode (default):"
            echo "  Run without arguments for interactive menu"
            echo ""
            echo "Examples:"
            echo "  ./deploy.sh                                    # Interactive menu"
            echo "  ./deploy.sh --all                              # Deploy all services"
            echo "  ./deploy.sh --all --yes                        # Deploy all, skip confirmation"
            echo "  ./deploy.sh --services triposr                 # Deploy single service"
            echo "  ./deploy.sh --services triposr,frontend        # Deploy multiple services"
            echo "  ./deploy.sh --services triposr,frontend --yes  # Deploy without confirmation"
            echo "  ./deploy.sh --services frontend                # Update frontend only"
            echo "  ./deploy.sh --services asset-manager,frontend  # Update UI stack"
            echo "  ./deploy.sh --services triposr,stable3dgen,direct3d-s2  # All models only"
            echo "  ./deploy.sh --yes                              # Interactive with auto-approve"
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
echo "3D Inference Services Deployment"
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

# Install prerequisites automatically on Amazon Linux
install_prerequisites() {
    echo "=========================================="
    echo "Installing Prerequisites"
    echo "=========================================="
    
    # Check if running as root or with sudo access
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        echo "ERROR: This script requires sudo access to install packages"
        echo "Please run with sudo or ensure your user has sudo privileges"
        exit 1
    fi
    
    local needs_install=false
    
    # Check and install Git
    if ! command -v git >/dev/null 2>&1; then
        echo "Installing Git..."
        sudo yum install -y git
        needs_install=true
    else
        echo "✓ Git already installed"
    fi
    
    # Check and install Docker
    if ! command -v docker >/dev/null 2>&1; then
        echo "Installing Docker..."
        sudo yum install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
        echo "⚠️  Docker installed. You may need to log out and back in for group changes to take effect."
        needs_install=true
    else
        echo "✓ Docker already installed"
        # Ensure Docker is running
        if ! sudo systemctl is-active --quiet docker; then
            echo "Starting Docker service..."
            sudo systemctl start docker
        fi
    fi
    
    # Check and install AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        echo "Installing AWS CLI v2..."
        cd /tmp
        curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip -q awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
        cd - >/dev/null
        needs_install=true
    else
        echo "✓ AWS CLI already installed"
    fi
    
    # Check and install kubectl
    if ! command -v kubectl >/dev/null 2>&1; then
        echo "Installing kubectl..."
        cd /tmp
        curl -sLO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        rm kubectl
        cd - >/dev/null
        needs_install=true
    else
        echo "✓ kubectl already installed"
    fi
    
    # Check and install Helm
    if ! command -v helm >/dev/null 2>&1; then
        echo "Installing Helm..."
        curl -s https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
        needs_install=true
    else
        echo "✓ Helm already installed"
    fi
    
    # Install unzip if not present (needed for AWS CLI)
    if ! command -v unzip >/dev/null 2>&1; then
        echo "Installing unzip..."
        sudo yum install -y unzip
    fi
    
    echo ""
    echo "✓ All prerequisites installed"
    
    if [ "$needs_install" = true ]; then
        echo ""
        echo "⚠️  NOTE: If Docker was just installed, you may need to:"
        echo "  1. Log out and log back in for Docker group permissions"
        echo "  2. Or run: newgrp docker"
        echo ""
    fi
}

# Check disk space
check_disk_space() {
    echo "Checking disk space..."
    local required_gb=50
    local available_gb=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    
    if [ "$available_gb" -lt "$required_gb" ]; then
        echo "ERROR: Insufficient disk space. Required: ${required_gb}GB, Available: ${available_gb}GB"
        exit 1
    fi
    
    echo "✓ Sufficient disk space available (${available_gb}GB)"
}


# Build service function
build_service() {
    local service=$1
    local ecr_uri=$2
    local tag=$3
    local log_file="logs/${service}-build.log"
    
    echo "[$service] Building Docker image..." | tee "$log_file"
    
    # Determine dockerfile path and build context based on service type
    local dockerfile_path
    local build_context="."
    
    if [ "$service" = "asset-manager" ]; then
        dockerfile_path="./services/$service/Dockerfile"
    elif [ "$service" = "frontend" ]; then
        dockerfile_path="../frontend/Dockerfile"
        build_context="../frontend"
    else
        dockerfile_path="./models/$service/Dockerfile"
    fi
    
    if docker build -f $dockerfile_path -t $ecr_uri:$tag $build_context &>>"$log_file"; then
        echo "[$service] ✓ Build complete" | tee -a "$log_file"
        return 0
    else
        echo "[$service] ✗ Build failed (see $log_file)" | tee -a "$log_file"
        return 1
    fi
}

# Push service function with retry logic
push_service() {
    local service=$1
    local ecr_uri=$2
    local tag=$3
    local log_file="logs/${service}-push.log"
    local retries=3
    local delay=5
    
    echo "[$service] Pushing to ECR..." | tee "$log_file"
    
    for attempt in $(seq 1 $retries); do
        if docker push $ecr_uri:$tag &>>"$log_file"; then
            echo "[$service] ✓ Push complete" | tee -a "$log_file"
            return 0
        else
            if [ $attempt -lt $retries ]; then
                echo "[$service] Push attempt $attempt failed, retrying in ${delay}s..." | tee -a "$log_file"
                sleep $delay
                delay=$((delay * 2))
            fi
        fi
    done
    
    echo "[$service] ✗ Push failed after $retries attempts (see $log_file)" | tee -a "$log_file"
    return 1
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

install_prerequisites
check_disk_space

# If no services selected, deploy all
if [ ${#SELECTED_SERVICES[@]} -eq 0 ]; then
    SELECTED_SERVICES=("triposr" "stable3dgen" "direct3d-s2" "asset-manager" "frontend")
fi

echo ""
echo "Services to deploy: ${SELECTED_SERVICES[*]}"

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
    echo "✓ Auto-approved (--yes flag)"
fi

# Validate Terraform state exists
if [ ! -f "../terraform/terraform.tfstate" ]; then
    echo "ERROR: Terraform state not found. Run 'terraform apply' first."
    exit 1
fi

# Get outputs from Terraform with error handling
cd ../terraform
echo "Fetching Terraform outputs..."

TRIPOSR_ECR_URI=$(terraform output -raw triposr_repository_uri 2>/dev/null || echo "")
STABLE3DGEN_ECR_URI=$(terraform output -raw stable3dgen_repository_uri 2>/dev/null || echo "")
DIRECT3D_S2_ECR_URI=$(terraform output -raw direct3d_s2_repository_uri 2>/dev/null || echo "")
ASSET_MANAGER_ECR_URI=$(terraform output -raw asset_manager_repository_uri 2>/dev/null || echo "")
FRONTEND_ECR_URI=$(terraform output -raw frontend_repository_uri 2>/dev/null || echo "")
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

# Generate version tag from git commit
if git rev-parse --git-dir > /dev/null 2>&1; then
    TAG=$(git rev-parse --short HEAD)
    echo "Using git commit SHA as tag: $TAG"
else
    TAG=$(date +%Y%m%d-%H%M%S)
    echo "Git not available, using timestamp as tag: $TAG"
fi

echo ""
echo "Configuration:"
echo "  EKS Cluster: $EKS_CLUSTER"
echo "  Region: $AWS_REGION"
echo "  S3 Bucket: $S3_BUCKET"
echo "  DynamoDB Table: $DYNAMODB_TABLE"
echo "  Version Tag: $TAG"
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

# Login to ECR (handle both public and private)
echo ""
echo "Logging into ECR..."
if [[ "$TRIPOSR_ECR_URI" == public.ecr.aws/* ]]; then
    echo "Using ECR Public..."
    aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws
else
    echo "Using ECR Private..."
    ECR_REGISTRY=$(echo $TRIPOSR_ECR_URI | cut -d'/' -f1)
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
fi

# Create logs directory
mkdir -p logs

# Define services with associative arrays for proper tracking
declare -A SERVICE_ECRS
SERVICE_ECRS["triposr"]="$TRIPOSR_ECR_URI"
SERVICE_ECRS["stable3dgen"]="$STABLE3DGEN_ECR_URI"
SERVICE_ECRS["direct3d-s2"]="$DIRECT3D_S2_ECR_URI"
SERVICE_ECRS["asset-manager"]="$ASSET_MANAGER_ECR_URI"
SERVICE_ECRS["frontend"]="$FRONTEND_ECR_URI"

# Verify selected service directories exist
VALID_SERVICES=()
for service in "${SELECTED_SERVICES[@]}"; do
    # Validate ECR URI exists
    if [ -z "${SERVICE_ECRS[$service]}" ]; then
        echo "WARNING: No ECR URI found for $service, skipping"
        continue
    fi
    
    # Check in models/, services/, or frontend/ directory depending on service type
    if [ "$service" = "asset-manager" ]; then
        if [ -d "services/$service" ]; then
            VALID_SERVICES+=("$service")
        else
            echo "WARNING: Service directory services/$service not found, skipping"
        fi
    elif [ "$service" = "frontend" ]; then
        if [ -d "../frontend" ]; then
            VALID_SERVICES+=("$service")
        else
            echo "WARNING: Frontend directory ../frontend not found, skipping"
        fi
    else
        if [ -d "models/$service" ]; then
            VALID_SERVICES+=("$service")
        else
            echo "WARNING: Service directory models/$service not found, skipping"
        fi
    fi
done

if [ ${#VALID_SERVICES[@]} -eq 0 ]; then
    echo "ERROR: No valid service directories found"
    exit 1
fi

echo ""
echo "=========================================="
echo "STAGE 1: Building Docker Images (Parallel)"
echo "=========================================="
echo "Building ${#VALID_SERVICES[@]} services in parallel..."
echo ""

# Build all services in parallel
declare -A BUILD_PIDS
for service in "${VALID_SERVICES[@]}"; do
    build_service "$service" "${SERVICE_ECRS[$service]}" "$TAG" &
    BUILD_PIDS[$service]=$!
done

# Wait for all builds and collect results
BUILD_FAILED=()
for service in "${VALID_SERVICES[@]}"; do
    if ! wait ${BUILD_PIDS[$service]}; then
        BUILD_FAILED+=("$service")
    fi
done

if [ ${#BUILD_FAILED[@]} -ne 0 ]; then
    echo ""
    echo "✗ Build failed for: ${BUILD_FAILED[*]}"
    echo "Check logs in ./logs/ directory for details"
    exit 1
fi

echo ""
echo "✓ All builds completed successfully"

echo ""
echo "=========================================="
echo "STAGE 2: Pushing to ECR (Parallel)"
echo "=========================================="
echo "Pushing ${#VALID_SERVICES[@]} images in parallel..."
echo ""

# Push all services in parallel
declare -A PUSH_PIDS
for service in "${VALID_SERVICES[@]}"; do
    push_service "$service" "${SERVICE_ECRS[$service]}" "$TAG" &
    PUSH_PIDS[$service]=$!
done

# Wait for all pushes
PUSH_FAILED=()
for service in "${VALID_SERVICES[@]}"; do
    if ! wait ${PUSH_PIDS[$service]}; then
        PUSH_FAILED+=("$service")
    fi
done

if [ ${#PUSH_FAILED[@]} -ne 0 ]; then
    echo ""
    echo "✗ Push failed for: ${PUSH_FAILED[*]}"
    echo "Check logs in ./logs/ directory for details"
    exit 1
fi

echo ""
echo "✓ All images pushed successfully"

echo ""
echo "=========================================="
echo "STAGE 3: Deploying with Helm (Parallel)"
echo "=========================================="
echo "Deploying ${#VALID_SERVICES[@]} services in parallel..."
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
    echo "Version: $TAG"
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
        echo "  cat logs/${service}-*.log"
    done
    exit 1
fi
