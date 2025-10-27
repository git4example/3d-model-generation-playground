#!/bin/bash

# Deployment script for Direct3D-S2 model service
# Follows the same pattern as other models in the repository

set -e

# Configuration
MODEL_NAME="direct3d-s2"
NAMESPACE=${NAMESPACE:-"model-inference"}
ECR_REGISTRY=${ECR_REGISTRY:-"your-ecr-registry.dkr.ecr.us-west-2.amazonaws.com"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

echo "Deploying Direct3D-S2 model service..."
echo "Namespace: $NAMESPACE"
echo "Model: $MODEL_NAME"
echo "Image Tag: $IMAGE_TAG"

# Build and push the image first
echo "Building and pushing Docker image..."
ECR_PUSH=true ./build.sh

# Deploy using Helm
echo "Deploying with Helm..."
cd ../../helm

helm upgrade --install "$MODEL_NAME" . \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --values charts/"$MODEL_NAME"/values.yaml \
    --set image.repository="$ECR_REGISTRY/model-inference-$MODEL_NAME" \
    --set image.tag="$IMAGE_TAG" \
    --set service.name="$MODEL_NAME" \
    --wait \
    --timeout=600s

echo "Deployment completed successfully!"
echo ""
echo "To check status:"
echo "  kubectl get pods -n $NAMESPACE -l app=$MODEL_NAME"
echo ""
echo "To view logs:"
echo "  kubectl logs -n $NAMESPACE -l app=$MODEL_NAME -f"
echo ""
echo "To port-forward (for testing):"
echo "  kubectl port-forward -n $NAMESPACE svc/$MODEL_NAME 8000:80"
