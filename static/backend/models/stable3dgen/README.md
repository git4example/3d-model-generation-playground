# Stable3DGen Microservice

High-fidelity 3D geometry generation from images using Hi3DGenPipeline with normal bridging.

## Overview

Stable3DGen (Hi3DGen) is a state-of-the-art 3D generation model that creates high-quality 3D meshes from single images using a two-stage generation process:

1. **Sparse Structure Generation**: Creates a coarse 3D structure
2. **Structured Latent Generation**: Refines the structure with high-fidelity details

Key features:
- **Normal Bridging**: Uses StableNormal for improved geometry quality
- **Optional Background Removal**: BiRefNet for clean object extraction
- **Two-Stage Generation**: Configurable sampling steps and guidance strengths
- **Async Processing**: S3 upload with job tracking via DynamoDB

## Architecture

```
stable3dgen/
├── inference.py          # Stable3DGenInference class
├── main.py              # FastAPI async server
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container with PyTorch 2.4.0 + CUDA 12.1
├── build.sh            # Docker build script
├── deploy.sh           # Kubernetes deployment script
├── skaffold.yaml       # Skaffold dev configuration
└── shared/
    ├── s3_utils.py         # S3 upload utilities
    └── dynamodb_utils.py   # Job tracking
```

## Requirements

### Hardware
- **GPU**: NVIDIA A10G (24GB VRAM) recommended
  - AWS: `ml.g5.2xlarge` or `g5.2xlarge`
  - Minimum: 20GB VRAM for two-stage generation
- **CPU**: 8+ cores
- **RAM**: 32GB+ system memory

### Software
- Docker with GPU support
- Kubernetes cluster with GPU nodes
- AWS credentials (for S3 and DynamoDB)

## Installation

### Local Development

1. **Clone Stable3DGen repository**:
```bash
git clone --recursive https://github.com/Stable-X/Stable3DGen.git
```

2. **Install dependencies**:
```bash
# Install PyTorch 2.4.0 with CUDA 12.1
pip install torch==2.4.0 torchvision==0.19.0 --index-url https://download.pytorch.org/whl/cu121

# Install CUDA-specific packages
pip install spconv-cu121==2.3.6 xformers==0.0.27.post2

# Install other requirements
pip install -r requirements.txt
```

3. **Set environment variables**:
```bash
export S3_BUCKET=your-bucket-name
export AWS_REGION=us-west-2
export DYNAMODB_TABLE=stable3dgen-jobs
```

4. **Run the server**:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker Build

```bash
# Build image
./build.sh

# Or manually
docker build -t stable3dgen:latest .
```

**Note**: Build time is 15-20 minutes due to spconv compilation.

### Kubernetes Deployment

```bash
# Deploy to cluster
./deploy.sh

# Or with Helm directly
helm upgrade --install stable3dgen ../../helm/charts/stable3dgen \
  --namespace default \
  --set image.repository=your-registry/stable3dgen \
  --set image.tag=latest
```

## API Endpoints

### POST /generate
Generate 3D model from image (async only).

**Request**:
```json
{
  "input": "base64_encoded_image",
  "no_remove_bg": false,
  "seed": 42,
  "ss_guidance_strength": 3.0,
  "ss_sampling_steps": 50,
  "slat_guidance_strength": 3.0,
  "slat_sampling_steps": 6,
  "model_save_format": "glb"
}
```

**Response**:
```json
{
  "success": true,
  "job_id": "uuid",
  "status": "queued",
  "status_url": "/status/{job_id}"
}
```

### GET /status/{job_id}
Check job status and retrieve results.

**Response**:
```json
{
  "id": "uuid",
  "status": "completed",
  "progress": 100,
  "output": {
    "s3_key": "models/uuid/model.glb",
    "download_url": "https://...",
    "vertices": 50000,
    "faces": 100000,
    "file_size_bytes": 5242880
  }
}
```

### GET /health
Health check endpoint.

### GET /info
Model information and capabilities.

### GET /jobs
List recent jobs.

### GET /gallery
List generated models in S3.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `S3_BUCKET` | Yes | - | S3 bucket for model storage |
| `AWS_REGION` | No | us-west-2 | AWS region |
| `DYNAMODB_TABLE` | No | - | DynamoDB table for job tracking |

### Helm Values

Key configuration in `values.yaml`:

```yaml
resources:
  requests:
    nvidia.com/gpu: "1"
    memory: "32Gi"
    cpu: "8"
  limits:
    nvidia.com/gpu: "1"
    memory: "64Gi"
    cpu: "16"

nodeSelector:
  node.kubernetes.io/instance-type: "g5.2xlarge"
```

## Model Details

### Models Downloaded on Startup
1. **Stable-X/trellis-normal-v0-1** (~4GB) - Hi3DGen pipeline
2. **Stable-X/yoso-normal-v1-8-1** (~2GB) - StableNormal variant  
3. **ZhengPeng7/BiRefNet** (~1GB) - Background removal
4. **facebookresearch/dinov2** - Image conditioning

**First startup**: 5-10 minutes for model downloads.

### Generation Process
1. Image preprocessing (optional background removal)
2. Normal map generation with StableNormal
3. Sparse structure generation (configurable steps)
4. Structured latent generation (configurable steps)
5. Mesh extraction and export

**Typical inference time**: 2-3 minutes per image.

## Troubleshooting

### Out of Memory (OOM)
- Reduce resolution or sampling steps
- Ensure A10G GPU (24GB VRAM)
- Check for memory leaks in long-running pods

### Model Download Failures
- Check HuggingFace connectivity
- Verify disk space (10GB+ needed)
- Check startup probe timeout (300s)

### Build Failures
- `spconv-cu121` compilation: Ensure CUDA 12.1 compatibility
- `xformers` version: Must match PyTorch 2.4.0 exactly
- Try reducing `MAX_JOBS` if build runs out of memory

## Performance Optimization

### Faster Inference
- Use default sampling steps (50 sparse, 6 slat)
- Skip background removal for clean images
- Pre-warm GPU with test inference

### Cost Optimization
- Use spot instances for non-critical workloads
- Scale down pods during low usage
- Cache models in persistent volume

## References

- **Paper**: Hi3DGen: High-fidelity 3D Geometry Generation from Images via Normal Bridging
- **Repository**: https://github.com/Stable-X/Stable3DGen
- **Base Model**: Microsoft Trellis

## License

MIT License - see Stable3DGen repository for details.
