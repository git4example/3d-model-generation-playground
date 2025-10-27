#!/bin/bash
set -e

echo "=========================================="
echo "Building Stable3DGen Docker Image"
echo "=========================================="

# Get ECR repository URI from Terraform
cd ../../../terraform
STABLE3DGEN_ECR_URI=$(terraform output -raw stable3dgen_repository_uri 2>/dev/null || echo "")
cd -

if [ -z "$STABLE3DGEN_ECR_URI" ]; then
    echo "ERROR: Could not get ECR URI from Terraform"
    echo "Please run 'terraform apply' first in the terraform/ directory"
    exit 1
fi

# Extract registry base (remove repository name)
# From: public.ecr.aws/v1g0v6a3/stable3dgen-model
# To:   public.ecr.aws/v1g0v6a3
STABLE3DGEN_REGISTRY=${STABLE3DGEN_ECR_URI%/*}

echo "ECR Repository: $STABLE3DGEN_ECR_URI"
echo "Registry Base: $STABLE3DGEN_REGISTRY"

# Build the Docker image
echo ""
echo "Building Docker image..."
cd ../..
docker build \
  --platform linux/amd64 \
  --build-arg TORCH_CUDA_ARCH_LIST="8.0;8.6;8.9;9.0+PTX" \
  --build-arg MAX_JOBS=16 \
  -t stable3dgen:latest \
  -f models/stable3dgen/Dockerfile .
cd models/stable3dgen

docker tag stable3dgen:latest ${STABLE3DGEN_ECR_URI}:latest
docker tag stable3dgen:latest ${STABLE3DGEN_ECR_URI}:$(git rev-parse --short HEAD 2>/dev/null || echo "local")

aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

# Push to ECR
echo ""
echo "Pushing image to ECR..."
docker push ${STABLE3DGEN_ECR_URI}:latest
docker push ${STABLE3DGEN_ECR_URI}:$(git rev-parse --short HEAD 2>/dev/null || echo "local")

echo ""
echo "=========================================="
echo "Build complete!"
echo "Image: ${STABLE3DGEN_ECR_URI}:latest"
echo "=========================================="
