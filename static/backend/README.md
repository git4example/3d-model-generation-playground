# Backend

3D model inference services deployed on Amazon EKS.

## Structure

```
backend/
├── models/          Application code (Dockerfiles, FastAPI services)
├── helm/            Deployment configuration (Kubernetes manifests)
└── k8s/             Raw manifests (legacy, use Helm instead)
```

## Services

### TripoSR
Fast 3D reconstruction from single images using Stability AI's TripoSR model.

**Location:** `models/triposr/`
**Technology:** FastAPI, PyTorch, CUDA 12.4
**GPU:** NVIDIA (6GB+ VRAM)
**Output:** GLB, OBJ formats

## Prerequisites

```bash
aws --version          # AWS CLI
docker --version       # Docker 20+
kubectl version        # kubectl
helm version           # Helm 3+
terraform version      # Terraform 1.5+
skaffold version       # Skaffold (optional, for fast dev)
```

AWS credentials configured:
```bash
aws configure
```

Install Skaffold (optional, for development):
```bash
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
chmod +x skaffold
sudo mv skaffold /usr/local/bin
```

## Infrastructure Setup

Deploy EKS cluster and supporting resources:

```bash
cd ../terraform
terraform init
terraform apply
```

Outputs: ECR URI, S3 bucket, cluster name, region

Update kubeconfig:
```bash
aws eks update-kubeconfig --region us-west-2 --name eks-3d-model-inference
```

## Build & Deploy TripoSR

### Option 1: Traditional Build & Deploy (Production)

**Build Docker Image:**
```bash
cd models/triposr
./build.sh
```

Builds image and pushes to ECR (uses Terraform outputs).

**Deploy to Kubernetes:**
```bash
./deploy.sh
```

Workflow:
1. Reads Terraform outputs
2. Updates kubeconfig
3. Updates Helm dependencies
4. Validates chart
5. Deploys via Helm with `--set` flags

Deployment uses:
- Helm chart: `../../helm/`
- Release name: `3d-platform`
- Namespace: `3d-inferencing`
- GPU nodes: `g4dn.4xlarge` spot instances

### Option 2: Skaffold (Fast Development)

**Installation:**
```bash
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
chmod +x skaffold
sudo mv skaffold /usr/local/bin
```

**Quick Start (Recommended):**
```bash
cd models/triposr
./skaffold-dev.sh
```

The helper script automatically:
- Authenticates to public ECR
- Updates kubeconfig from Terraform
- Runs Skaffold in dev mode with port forwarding

**Manual Mode:**
```bash
cd models/triposr

# Authenticate to public ECR (required for push)
aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

# Run Skaffold
skaffold dev --port-forward
```

Features:
- **File sync:** Python changes sync in 5 seconds (no rebuild)
- **Auto-rebuild:** Dockerfile changes trigger rebuild automatically
- **Live logs:** Streams pod logs to terminal
- **Port forwarding:** Access service on `localhost:8000`
- **Watch mode:** Detects file changes and redeploys

**First run:** Builds image, pushes to ECR, deploys to K8s (20 min)
**Python changes:** Syncs files directly to pod (5 sec)
**Dockerfile changes:** Rebuilds with BuildKit cache (2-3 min)

**Production Deploy:**
```bash
skaffold run -p prod
```

Uses git commit SHA for image tag, full rebuild, pushes to ECR.

**Configuration:**
Located in `models/triposr/skaffold.yaml`

**Profiles:**
- `dev`: Fast iteration with file sync
- `prod`: Production build and deploy

**How File Sync Works:**
- Changes to `main.py` or `shared/*.py` sync directly to running pod
- No Docker rebuild required
- No ECR push required
- No pod restart required
- Model stays loaded in memory
- **300x faster** than full rebuild cycle

### Verify Deployment

```bash
kubectl get pods -n 3d-inferencing
kubectl get svc -n 3d-inferencing
kubectl get ingress -n 3d-inferencing
```

Check logs:
```bash
kubectl logs -f -n 3d-inferencing -l app=triposr
```

## API Endpoints

Base URL: `https://api.riv.quinncsh.people.aws.dev` (or cluster ingress)

### POST /generate
Generate 3D model from image.

**Request:**
```json
{
  "input": "base64_encoded_image_data",
  "input_type": "image",
  "no_remove_bg": false,
  "foreground_ratio": 0.85,
  "mc_resolution": 256,
  "model_save_format": "glb"
}
```

**Sync Response:**
```json
{
  "success": true,
  "output": {
    "glb_base64": "...",
    "vertices": 12345,
    "faces": 23456,
    "processing_time": 0.42
  }
}
```

**Async Response** (when S3 configured):
```json
{
  "success": true,
  "job_id": "uuid",
  "status": "queued",
  "status_url": "/status/uuid"
}
```

### GET /status/{job_id}
Check async job status.

### GET /test
Test endpoint with embedded sample image (no parameters required).

### GET /health
Health check.

**Response:**
```json
{
  "status": "healthy",
  "model": "triposr",
  "loaded": true,
  "gpu_available": true,
  "s3_enabled": true
}
```

### GET /info
Model information and capabilities.

### GET /jobs
List recent jobs.

### DELETE /jobs
Cleanup old jobs (> 1 hour).

### GET /gallery
List models in S3 (requires S3 configuration).

### DELETE /gallery/{job_id}
Delete model from S3.

## Environment Variables

Set via Helm chart or Kubernetes deployment:

**TRIPOSR_CHUNK_SIZE**
Default: `8192`
GPU memory optimization (lower = less VRAM usage).

**S3_BUCKET**
S3 bucket for model storage (enables async mode).

**AWS_REGION**
Default: `us-west-2`
AWS region for S3 operations.

## Helm Chart Structure

```
helm/
├── Chart.yaml           Umbrella chart metadata
├── values.yaml          Default values
├── .helmignore          Exclusion patterns
└── charts/
    └── triposr/         TripoSR subchart
        ├── Chart.yaml
        └── templates/
            ├── triposr.yaml    All K8s resources
            └── NOTES.txt       Post-install info
```

**Deploy command:**
```bash
helm upgrade 3d-platform ./helm \
  --set triposr.image.repository=public.ecr.aws/xxx/triposr \
  --set triposr.env.s3Bucket=my-bucket \
  --set triposr.env.awsRegion=us-west-2 \
  --namespace 3d-inferencing \
  --create-namespace \
  --atomic
```

## Adding New Services

Copy triposr structure:

```bash
# Copy model code
cp -r models/triposr models/newmodel

# Copy Helm subchart
cp -r helm/charts/triposr helm/charts/newmodel

# Update names in Chart.yaml files
# Add dependency to helm/Chart.yaml
# Add values to helm/values.yaml under newmodel: key
```

## Troubleshooting

**Pod stuck in Pending:**
```bash
kubectl describe pod -n 3d-inferencing <pod-name>
```
Check: GPU node availability, resource requests, Karpenter logs.

**Image pull errors:**
```bash
kubectl get events -n 3d-inferencing
```
Verify ECR authentication and image exists.

**GPU not available:**
```bash
kubectl exec -n 3d-inferencing <pod-name> -- nvidia-smi
```
Check GPU node provisioning and tolerations.

**Model loading timeout:**
Increase `initialDelaySeconds` in readiness probe (current: 600s).

**S3 access denied:**
Verify Pod Identity association:
```bash
aws eks list-pod-identity-associations --cluster-name eks-3d-model-inference
```

## Rollback

```bash
helm rollback 3d-platform -n 3d-inferencing
```

List revisions:
```bash
helm history 3d-platform -n 3d-inferencing
```

## Cleanup

Delete deployment:
```bash
helm uninstall 3d-platform -n 3d-inferencing
```

Delete namespace:
```bash
kubectl delete namespace 3d-inferencing
```

Destroy infrastructure:
```bash
cd ../terraform
terraform destroy
```
