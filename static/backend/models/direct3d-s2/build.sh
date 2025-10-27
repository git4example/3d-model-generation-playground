#!/bin/bash
set -e

cd ../../../terraform
DIRECT3D_S2_ECR_URI=$(terraform output -raw direct3d_s2_repository_uri 2>/dev/null || echo "")
cd -

if [ -z "$DIRECT3D_S2_ECR_URI" ]; then
    echo "ERROR: Could not get ECR URI from Terraform"
    exit 1
fi

DIRECT3D_S2_REGISTRY=${DIRECT3D_S2_ECR_URI%/*}

echo "Building..."
cd ../..
docker build -f models/direct3d-s2/Dockerfile -t direct3d-s2:latest .
cd models/direct3d-s2

docker tag direct3d-s2:latest ${DIRECT3D_S2_ECR_URI}:latest
docker tag direct3d-s2:latest ${DIRECT3D_S2_ECR_URI}:$(git rev-parse --short HEAD 2>/dev/null || echo "local")

aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

docker push ${DIRECT3D_S2_ECR_URI}:latest
docker push ${DIRECT3D_S2_ECR_URI}:$(git rev-parse --short HEAD 2>/dev/null || echo "local")

echo "Build complete: ${DIRECT3D_S2_ECR_URI}:latest"
