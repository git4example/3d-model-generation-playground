#!/bin/bash
set -e

echo "=========================================="
echo "Building TripoSR Docker Image"
echo "=========================================="

# Get ECR repository URI from Terraform
cd ../../../terraform
TRIPOSR_ECR_URI=$(terraform output -raw triposr_repository_uri 2>/dev/null || echo "")
cd -

if [ -z "$TRIPOSR_ECR_URI" ]; then
    echo "ERROR: Could not get ECR URI from Terraform"
    echo "Please run 'terraform apply' first in the terraform/ directory"
    exit 1
fi

# Extract registry base (remove repository name)
# From: public.ecr.aws/v1g0v6a3/triposr-model
# To:   public.ecr.aws/v1g0v6a3
TRIPOSR_REGISTRY=${TRIPOSR_ECR_URI%/*}

echo "ECR Repository: $TRIPOSR_ECR_URI"
echo "Registry Base: $TRIPOSR_REGISTRY"

# Build the Docker image from parent directory
echo ""
echo "Building Docker image..."
cd ../..
docker build -f models/triposr/Dockerfile -t triposr:latest .
cd models/triposr

# Tag with full repository path
docker tag triposr:latest ${TRIPOSR_ECR_URI}:latest
docker tag triposr:latest ${TRIPOSR_ECR_URI}:$(git rev-parse --short HEAD 2>/dev/null || echo "local")

aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

# Push to ECR
echo ""
echo "Pushing image to ECR..."
docker push ${TRIPOSR_ECR_URI}:latest
docker push ${TRIPOSR_ECR_URI}:$(git rev-parse --short HEAD 2>/dev/null || echo "local")

echo ""
echo "=========================================="
echo "Build complete!"
echo "Image: ${TRIPOSR_ECR_URI}:latest"
echo "=========================================="
