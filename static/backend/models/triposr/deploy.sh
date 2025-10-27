#!/bin/bash
set -e

echo "=========================================="
echo "Deploying 3D Inference Platform with Helm"
echo "=========================================="

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo "ERROR: helm is not installed. Install with:"
    echo "  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
    exit 1
fi

# Get outputs from Terraform
cd ../../../terraform
TRIPOSR_ECR_URI=$(terraform output -raw triposr_repository_uri 2>/dev/null || echo "")
EKS_CLUSTER=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "")
AWS_REGION=$(terraform output -raw region 2>/dev/null || echo "us-west-2")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
DYNAMODB_TABLE=$(terraform output -raw dynamodb_jobs_table_name 2>/dev/null || echo "")
cd -

if [ -z "$TRIPOSR_ECR_URI" ]; then
    echo "ERROR: Could not get ECR URI from Terraform"
    exit 1
fi

if [ -z "$EKS_CLUSTER" ]; then
    echo "ERROR: Could not get EKS cluster name from Terraform"
    exit 1
fi

echo "ECR Repository: $TRIPOSR_ECR_URI"
echo "EKS Cluster: $EKS_CLUSTER"
echo "Region: $AWS_REGION"
echo "S3 Bucket: $S3_BUCKET"
echo "DynamoDB Table: $DYNAMODB_TABLE"

# Update kubeconfig
echo ""
echo "Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER

# Update Helm dependencies
echo ""
echo "Updating Helm chart dependencies..."
cd ../../helm
helm dependency update
cd -

# Validate the chart
echo ""
echo "Validating Helm chart..."
helm lint ../../helm/

# Deploy or upgrade using Helm
RELEASE_NAME="3d-platform"
NAMESPACE="3d-inferencing"
CHART_PATH="../../helm"

echo ""
echo "Deploying with Helm..."

if helm status $RELEASE_NAME -n $NAMESPACE &> /dev/null; then
    echo "Release exists, upgrading..."
    helm upgrade $RELEASE_NAME $CHART_PATH \
        --set triposr.image.repository=${TRIPOSR_ECR_URI} \
        --set triposr.env.s3Bucket=${S3_BUCKET} \
        --set triposr.env.dynamodbTable=${DYNAMODB_TABLE} \
        --set triposr.env.awsRegion=${AWS_REGION} \
        --namespace $NAMESPACE \
        --create-namespace \
        --wait \
        --timeout 10m \
        --atomic
else
    echo "Release does not exist, installing..."
    helm install $RELEASE_NAME $CHART_PATH \
        --set triposr.image.repository=${TRIPOSR_ECR_URI} \
        --set triposr.env.s3Bucket=${S3_BUCKET} \
        --set triposr.env.dynamodbTable=${DYNAMODB_TABLE} \
        --set triposr.env.awsRegion=${AWS_REGION} \
        --namespace $NAMESPACE \
        --create-namespace \
        --wait \
        --timeout 10m \
        --atomic
fi

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="

# Show release information
echo ""
helm status $RELEASE_NAME -n $NAMESPACE

echo ""
echo "=========================================="
echo "Quick Reference Commands"
echo "=========================================="
echo ""
echo "View pods:"
echo "  kubectl get pods -n $NAMESPACE"
echo ""
echo "View services:"
echo "  kubectl get svc -n $NAMESPACE"
echo ""
echo "View ingress:"
echo "  kubectl get ingress -n $NAMESPACE"
echo ""
echo "View logs:"
echo "  kubectl logs -f -n $NAMESPACE -l app=triposr"
echo ""
echo "Helm commands:"
echo "  helm list -n $NAMESPACE"
echo "  helm history $RELEASE_NAME -n $NAMESPACE"
echo "  helm rollback $RELEASE_NAME -n $NAMESPACE"
echo ""
echo "=========================================="
