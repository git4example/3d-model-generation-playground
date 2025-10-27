#!/bin/bash
set -e

# Verify TorchSparse backend is functional
# This should always pass since we verify during build, but good to double-check
echo "🔍 Verifying TorchSparse installation..."

if python -c "import torchsparse; torchsparse.backend.build_kernel_map_subm_hashmap" 2>/dev/null; then
    echo "✅ TorchSparse is fully functional"
else
    echo "❌ TorchSparse backend not functional"
    echo "This should not happen as build verification passed."
    echo "Please rebuild the image."
    exit 1
fi

exec "$@"
