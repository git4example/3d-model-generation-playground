#!/bin/bash

# Deploy script for Stable3DGen Kubernetes deployment

set -e

# Configuration
NAMESPACE="${NAMESPACE:-default}"
HELM_RELEASE="${HELM_RELEASE:-stable3dgen}"
CHART_PATH="${CHART_PATH:-../../helm/charts/stable3dgen}"

echo "Deploying Stable3DGen to Kubernetes..."
echo "Namespace: $NAMESPACE"
echo "Helm Release: $HELM_RELEASE"
echo "Chart Path: $CHART_PATH"

# Check if helm chart exists
if [ ! -d "$CHART_PATH" ]; then
    echo "Error: Helm chart not found at $CHART_PATH"
    exit 1
fi

# Deploy using Helm
helm upgrade --install $HELM_RELEASE $CHART_PATH \
  --namespace $NAMESPACE \
  --create-namespace \
  --wait \
  --timeout 10m

echo "Deployment complete!"
echo ""
echo "To check status:"
echo "  kubectl get pods -n $NAMESPACE -l app=stable3dgen"
echo ""
echo "To view logs:"
echo "  kubectl logs -n $NAMESPACE -l app=stable3dgen -f"
echo ""
echo "To port-forward:"
echo "  kubectl port-forward -n $NAMESPACE svc/stable3dgen 8000:8000"
