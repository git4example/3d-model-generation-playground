#!/bin/bash
set -e

aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

echo ""
echo "Authentication successful!"

# Get Terraform outputs for context
echo ""
echo "Getting cluster information from Terraform..."
cd ../terraform
EKS_CLUSTER=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "")
AWS_REGION=$(terraform output -raw region 2>/dev/null || echo "us-west-2")
FRONTEND_ECR_URI=$(terraform output -raw frontend_repository_uri 2>/dev/null || echo "")
ECR_REPO=${FRONTEND_ECR_URI%/*}
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url 2>/dev/null || echo "")
cd - > /dev/null

if [ -n "$EKS_CLUSTER" ]; then
    echo "EKS Cluster: $EKS_CLUSTER"
    echo "Region: $AWS_REGION"
    echo "ECR Repository: $ECR_REPO"
    echo "CloudFront URL: $CLOUDFRONT_URL"

    # Update kubeconfig to ensure we're pointing to the right cluster
    echo ""
    echo "Updating kubeconfig..."
    aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER
else
    echo "WARNING: Could not get EKS cluster name from Terraform"
    echo "Make sure kubectl is configured correctly"
fi

# Update skaffold.yaml with actual CloudFront URL if available
if [ -n "$CLOUDFRONT_URL" ]; then
    echo ""
    echo "Updating skaffold.yaml with CloudFront URL: $CLOUDFRONT_URL"
    sed -i.bak "s|env.publicApiBaseUrl: \".*\"|env.publicApiBaseUrl: \"$CLOUDFRONT_URL\"|" skaffold.yaml
fi

echo ""
echo "Starting Skaffold development mode..."
skaffold dev --default-repo=$ECR_REPO --port-forward
