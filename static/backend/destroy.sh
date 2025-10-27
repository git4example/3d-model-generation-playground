#!/bin/bash
set -e

# Parse command line arguments
SELECTED_SERVICES=()
AUTO_APPROVE=false

# Show examples if no arguments provided
if [ $# -eq 0 ]; then
    echo "=========================================="
    echo "3D Inference Services Cleanup"
    echo "=========================================="
    echo ""
    echo "Usage: ./destroy.sh [OPTIONS]"
    echo ""
    echo "You must specify what to remove. Here are some examples:"
    echo ""
    echo "  # Remove all services"
    echo "  ./destroy.sh --all"
    echo "  ./destroy.sh --all --yes"
    echo ""
    echo "  # Remove specific services"
    echo "  ./destroy.sh --services triposr"
    echo "  ./destroy.sh --services triposr,frontend"
    echo "  ./destroy.sh --services triposr,frontend --yes"
    echo ""
    echo "  # Remove backend services only"
    echo "  ./destroy.sh --services triposr,stable3dgen,direct3d-s2,asset-manager"
    echo "  ./destroy.sh --services triposr,stable3dgen,direct3d-s2,asset-manager --yes"
    echo ""
    echo "  # Remove frontend only"
    echo "  ./destroy.sh --services frontend"
    echo "  ./destroy.sh --services frontend --yes"
    echo ""
    echo "  # Remove models only (keep asset-manager and frontend)"
    echo "  ./destroy.sh --services triposr,stable3dgen,direct3d-s2"
    echo "  ./destroy.sh --services triposr,stable3dgen,direct3d-s2 -y"
    echo ""
    echo "  # Remove single model for testing"
    echo "  ./destroy.sh --services stable3dgen --yes"
    echo ""
    echo "  # Remove UI stack only"
    echo "  ./destroy.sh --services asset-manager,frontend"
    echo ""
    echo "Available services:"
    echo "  - triposr          (Fast 3D generation)"
    echo "  - stable3dgen      (High quality)"
    echo "  - direct3d-s2      (Balanced)"
    echo "  - asset-manager    (Gallery & job management)"
    echo "  - frontend         (Web UI)"
    echo ""
    echo "Options:"
    echo "  --all              Remove all services"
    echo "  --services <list>  Remove specific services (comma-separated)"
    echo "  --yes, -y          Skip confirmation prompts (auto-approve)"
    echo "  --help             Show detailed help with more information"
    echo ""
    echo "NOTE: This script only removes application deployments."
    echo "Infrastructure (namespace, ingress, ALB, etc.) is managed by Terraform."
    echo "To remove infrastructure, run: cd ../terraform && terraform destroy"
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
            echo "Usage: ./destroy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --all              Remove all services (non-interactive)"
            echo "  --services <list>  Remove specific services (comma-separated)"
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
            echo "  # Interactive mode with menu"
            echo "  ./destroy.sh"
            echo ""
            echo "  # Remove all services with confirmation"
            echo "  ./destroy.sh --all"
            echo ""
            echo "  # Remove all services without confirmation"
            echo "  ./destroy.sh --all --yes"
            echo ""
            echo "  # Remove specific services"
            echo "  ./destroy.sh --services triposr,frontend"
            echo ""
            echo "  # Remove specific services without confirmation"
            echo "  ./destroy.sh --services triposr,frontend -y"
            echo ""
            echo "  # Remove backend services only"
            echo "  ./destroy.sh --services triposr,stable3dgen,direct3d-s2,asset-manager"
            echo ""
            echo "  # Remove frontend only with auto-approve"
            echo "  ./destroy.sh --services frontend --yes"
            echo ""
            echo "  # Remove models only"
            echo "  ./destroy.sh --services triposr,stable3dgen,direct3d-s2 -y"
            echo ""
            echo "NOTE: This script only removes application deployments."
            echo "Infrastructure (namespace, ingress, ALB, etc.) is managed by Terraform."
            echo "To remove infrastructure, run: cd ../terraform && terraform destroy"
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
echo "3D Inference Services Cleanup"
echo "=========================================="
echo ""
echo "NOTE: This script only removes application deployments."
echo "Infrastructure (namespace, ingress, ALB, etc.) is managed by Terraform."
echo ""

# Check prerequisites
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


check_prerequisites

# If no services selected, remove all
if [ ${#SELECTED_SERVICES[@]} -eq 0 ]; then
    SELECTED_SERVICES=("triposr" "stable3dgen" "direct3d-s2" "asset-manager" "frontend")
fi

echo ""
echo "⚠️  WARNING: This will permanently uninstall these services!"
echo "Services to remove: ${SELECTED_SERVICES[*]}"

# Confirmation prompt (unless auto-approved)
if [ "$AUTO_APPROVE" = false ]; then
    echo ""
    # Extra confirmation for removing all services
    if [ ${#SELECTED_SERVICES[@]} -eq 5 ]; then
        echo "⚠️  You are about to remove ALL services!"
        read -p "Type 'yes' to confirm: " confirm
    else
        read -p "Continue? (yes/no) [no]: " confirm
    fi
    
    confirm=${confirm:-no}
    
    if [ "$confirm" != "yes" ]; then
        echo "Cleanup cancelled"
        exit 0
    fi
else
    echo ""
    echo "✓ Auto-approved (--yes flag)"
fi

# Get config from Terraform
if [ ! -f "../terraform/terraform.tfstate" ]; then
    echo ""
    echo "WARNING: Terraform state not found, using defaults"
    EKS_CLUSTER=""
    AWS_REGION="us-west-2"
else
    cd ../terraform
    EKS_CLUSTER=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "")
    AWS_REGION=$(terraform output -raw region 2>/dev/null || echo "us-west-2")
    cd ../backend
fi

if [ -z "$EKS_CLUSTER" ]; then
    echo ""
    echo "ERROR: Could not determine EKS cluster name"
    echo "Please provide cluster name manually:"
    read -p "EKS Cluster Name: " EKS_CLUSTER
    
    if [ -z "$EKS_CLUSTER" ]; then
        echo "ERROR: Cluster name required"
        exit 1
    fi
fi

echo ""
echo "Configuration:"
echo "  EKS Cluster: $EKS_CLUSTER"
echo "  Region: $AWS_REGION"
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
echo "✓ Cluster access verified"

# Uninstall selected services
echo ""
echo "=========================================="
echo "Uninstalling Services"
echo "=========================================="
echo ""

FAILED_UNINSTALLS=()
SUCCESSFUL_UNINSTALLS=()
NOT_FOUND=()

for SERVICE in "${SELECTED_SERVICES[@]}"; do
    echo "[$SERVICE] Uninstalling..."
    
    # Check if service exists
    if ! helm list -n 3d-inferencing 2>/dev/null | grep -q "^$SERVICE"; then
        echo "[$SERVICE] ℹ Not found (already uninstalled or never deployed)"
        NOT_FOUND+=("$SERVICE")
        continue
    fi
    
    # Attempt to uninstall
    if helm uninstall $SERVICE -n 3d-inferencing 2>/dev/null; then
        echo "[$SERVICE] ✓ Successfully uninstalled"
        SUCCESSFUL_UNINSTALLS+=("$SERVICE")
    else
        echo "[$SERVICE] ✗ Failed to uninstall"
        FAILED_UNINSTALLS+=("$SERVICE")
    fi
done

echo ""
echo "=========================================="
echo "Cleanup Summary"
echo "=========================================="
echo ""

# Report results
if [ ${#SUCCESSFUL_UNINSTALLS[@]} -gt 0 ]; then
    echo "✓ Successfully uninstalled (${#SUCCESSFUL_UNINSTALLS[@]}):"
    for SERVICE in "${SUCCESSFUL_UNINSTALLS[@]}"; do
        echo "  - $SERVICE"
    done
    echo ""
fi

if [ ${#NOT_FOUND[@]} -gt 0 ]; then
    echo "ℹ Not found (${#NOT_FOUND[@]}):"
    for SERVICE in "${NOT_FOUND[@]}"; do
        echo "  - $SERVICE"
    done
    echo ""
fi

if [ ${#FAILED_UNINSTALLS[@]} -gt 0 ]; then
    echo "✗ Failed to uninstall (${#FAILED_UNINSTALLS[@]}):"
    for SERVICE in "${FAILED_UNINSTALLS[@]}"; do
        echo "  - $SERVICE"
    done
    echo ""
    echo "You may need to manually clean up these services:"
    for SERVICE in "${FAILED_UNINSTALLS[@]}"; do
        echo "  helm uninstall $SERVICE -n 3d-inferencing --force"
    done
    echo ""
    exit 1
fi

echo "=========================================="
echo ""
echo "✓ Application cleanup complete!"
echo ""
echo "Applications have been removed from the cluster."
echo "The namespace and infrastructure remain intact (managed by Terraform)."
echo ""
echo "To remove ALL infrastructure including:"
echo "  - Namespace (3d-inferencing)"
echo "  - Ingress and ALB"
echo "  - EKS cluster"
echo "  - VPC, S3, DynamoDB, etc."
echo ""
echo "Run: cd ../terraform && terraform destroy"
echo ""
