#!/bin/bash
set -e

aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

echo ""
echo "Authentication successful!"

# Get Terraform outputs for context
echo ""
echo "Getting cluster information from Terraform..."
cd ../../../terraform
EKS_CLUSTER=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "")
AWS_REGION=$(terraform output -raw region 2>/dev/null || echo "us-west-2")
DIRECT3D_S2_ECR_URI=$(terraform output -raw direct3d_s2_repository_uri 2>/dev/null || echo "")
ECR_REPO=${DIRECT3D_S2_ECR_URI%/*}
cd - > /dev/null

if [ -n "$EKS_CLUSTER" ]; then
    echo "EKS Cluster: $EKS_CLUSTER"
    echo "Region: $AWS_REGION"
    echo "ECR Repository: $ECR_REPO"

    # Update kubeconfig to ensure we're pointing to the right cluster
    echo ""
    echo "Updating kubeconfig..."
    aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER
else
    echo "WARNING: Could not get EKS cluster name from Terraform"
    echo "Make sure kubectl is configured correctly"
fi


skaffold dev --default-repo=$ECR_REPO --port-forward
