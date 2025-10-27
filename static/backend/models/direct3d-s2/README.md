# Direct3D-S2 Model Service

This directory contains the Direct3D-S2 model service integration for the model-inference-for-3d-models repository. Direct3D-S2 enables gigascale 3D generation with Spatial Sparse Attention (SSA), supporting up to 1024³ resolution.

## Overview

**Direct3D-S2** is a scalable 3D generation framework based on sparse volumes that achieves superior output quality with dramatically reduced training costs. The key innovation is the Spatial Sparse Attention (SSA) mechanism, which enhances the efficiency of Diffusion Transformer (DiT) computations on sparse volumetric data.

### Key Features

- **Gigascale 3D Generation**: 1024³ resolution with only 8 GPUs
- **Spatial Sparse Attention**: 3.9× faster forward pass, 9.6× faster backward pass
- **Unified Sparse VAE**: Consistent sparse volumetric format across all stages
- **Multiple Output Formats**: OBJ, GLB, PLY, STL support
- **Background Removal**: Optional BiRefNet integration
- **Mesh Simplification**: Configurable remeshing and simplification

## Architecture

The service follows the same pattern as other models in this repository:

```
backend/models/direct3d-s2/
├── main.py              # FastAPI application
├── inference.py         # Direct3D-S2 inference wrapper
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container image definition
├── build.sh            # Build script
├── deploy.sh           # Deployment script
├── skaffold.yaml       # Skaffold configuration
├── cat.jpg             # Test image
└── shared/             # Shared utilities
    ├── s3_utils.py     # S3 upload and job management
    └── dynamodb_utils.py # DynamoDB job tracking
```

## API Endpoints

The service provides the same REST API interface as other models:

- `POST /generate` - Generate 3D model (async with S3 upload)
- `GET /test` - Test generation with sample image (sync)
- `GET /test-s3` - Test generation with S3 upload (async)
- `GET /status/{job_id}` - Check generation job status
- `GET /jobs` - List recent jobs
- `GET /gallery` - List generated models in S3
- `DELETE /gallery/{job_id}` - Delete model from S3
- `GET /health` - Health check
- `GET /info` - Model information

## Parameters

Direct3D-S2 supports the following generation parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `input` | string | required | Base64 encoded input image |
| `no_remove_bg` | boolean | false | Skip background removal |
| `use_alpha_channel` | boolean | false | Use alpha channel for background |
| `sdf_resolution` | integer | 1024 | SDF resolution (512 or 1024) |
| `mc_threshold` | float | 0.2 | Marching cubes threshold |
| `remesh` | boolean | true | Enable mesh simplification |
| `simplify_ratio` | float | 0.95 | Mesh simplification ratio |
| `remove_interior` | boolean | true | Remove interior faces |
| `model_save_format` | string | "obj" | Output format (obj, glb, ply, stl) |

## Hardware Requirements

- **GPU**: NVIDIA GPU with CUDA support
- **VRAM**: 
  - 10GB+ for 512 resolution
  - 24GB+ for 1024 resolution (recommended)
- **RAM**: 16GB+ system memory
- **Storage**: 10GB+ for model weights and cache

## Development

### Local Development

1. **Build the container:**
   ```bash
   ./build.sh
   ```

2. **Run locally:**
   ```bash
   docker run -p 8000:8000 --gpus all \
     -e S3_BUCKET=your-bucket \
     -e AWS_REGION=us-west-2 \
     your-ecr-registry/model-inference-direct3d-s2:latest
   ```

3. **Test the service:**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/test
   ```

### Kubernetes Deployment

1. **Deploy to cluster:**
   ```bash
   ./deploy.sh
   ```

2. **Check status:**
   ```bash
   kubectl get pods -n model-inference -l app=direct3d-s2
   ```

3. **View logs:**
   ```bash
   kubectl logs -n model-inference -l app=direct3d-s2 -f
   ```

### Skaffold Development

For rapid development cycles:

```bash
skaffold dev
```

This will:
- Build the container image
- Deploy to Kubernetes
- Set up port forwarding
- Watch for file changes and redeploy

## Configuration

### Environment Variables

- `S3_BUCKET` - S3 bucket for model storage
- `AWS_REGION` - AWS region (default: us-west-2)
- `TORCH_HOME` - PyTorch cache directory
- `HF_HOME` - Hugging Face cache directory

### Helm Values

Key configuration options in `values.yaml`:

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
    memory: 32Gi
    cpu: 4
  requests:
    nvidia.com/gpu: 1
    memory: 16Gi
    cpu: 2

nodeSelector: 
  node.kubernetes.io/instance-type: "g5.xlarge"

env:
  - name: S3_BUCKET
    value: "your-s3-bucket"
```

## Performance

Direct3D-S2 provides significant performance improvements:

- **Inference Speed**: ~1-2 minutes (faster than v1.0 with SSA)
- **Memory Efficiency**: Up to 19.7× faster backward pass
- **Scalability**: 1024³ resolution with 8 GPUs vs. 32 GPUs for traditional methods

## Model Information

- **Paper**: "Direct3D-S2: Gigascale 3D Generation Made Easy with Spatial Sparse Attention" (NeurIPS 2025)
- **Repository**: https://github.com/DreamTechAI/Direct3D-S2
- **Project Page**: https://neural4d.com/research/direct3d-s2
- **Model Weights**: Automatically downloaded from HuggingFace (wushuang98/Direct3D-S2)

## Troubleshooting

### Common Issues

1. **Out of Memory Errors**
   - Reduce `sdf_resolution` to 512
   - Ensure sufficient GPU VRAM (24GB+ recommended for 1024)
   - Check node GPU resources

2. **Model Loading Timeout**
   - Increase `initialDelaySeconds` in health checks
   - Verify network access to HuggingFace
   - Check available storage for model weights

3. **TorchSparse Installation Issues**
   - Ensure CUDA toolkit is properly installed
   - Check PyTorch CUDA version compatibility
   - Verify build tools are available

### Logs and Monitoring

Check application logs for detailed error information:

```bash
kubectl logs -n model-inference deployment/direct3d-s2 -f
```

Monitor GPU usage:
```bash
nvidia-smi
```

## Integration Notes

This implementation follows the same patterns as the existing `stable3dgen` and `triposr` models in the repository:

1. **Consistent API**: Same REST endpoints and response format
2. **Shared Utilities**: Reuses S3 and DynamoDB utilities
3. **Similar Architecture**: FastAPI + inference wrapper pattern
4. **Helm Integration**: Compatible with existing helm charts structure
5. **Job Management**: Supports both in-memory and DynamoDB job tracking

The service can be deployed alongside other models in the same Kubernetes cluster and managed through the same infrastructure.
