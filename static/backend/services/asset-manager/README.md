# Asset Manager Service

Centralized management API for 3D model generation jobs and objects.

## Overview

The Asset Manager provides a unified API to:
- List all 3D model objects stored in S3
- Query job status across all model types (TripoSR, Stable3DGen, Direct3D-S2)
- Get aggregate statistics and storage metrics

## Architecture

- **Data Source**: Primarily DynamoDB (fast queries with rich metadata)
- **S3 Integration**: Minimal usage (presigned URL refresh, storage stats)
- **No GPU Required**: Runs on cheap CPU nodes
- **Shared Utilities**: Reuses existing `dynamodb_utils.py` and `s3_utils.py`

## API Endpoints

### Objects
- `GET /objects` - List all objects (paginated, filterable)
- `GET /objects/{job_id}` - Get specific object details
- `GET /objects/stats/storage` - S3 storage statistics

### Jobs
- `GET /jobs/{job_id}` - Get job status
- `GET /jobs` - List all jobs (paginated, filterable)
- `GET /jobs/stats/summary` - Aggregate job statistics

### Health
- `GET /health` - Health check
- `GET /` - API information

## Deployment

### Local Development
```bash
cd backend/services/asset-manager
pip install -r requirements.txt
python main.py
# Access at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Kubernetes with Skaffold
```bash
cd backend/services/asset-manager
skaffold dev  # Development mode with hot reload
# or
skaffold run  # One-time deployment
```

### Environment Variables
- `AWS_REGION` - AWS region (default: us-west-2)
- `S3_BUCKET` - S3 bucket name for model storage
- `DYNAMODB_TABLE_NAME` - DynamoDB table for job tracking

## Example Usage

```bash
# List all completed objects
curl http://asset-manager-service:8000/objects

# Filter by model type
curl http://asset-manager-service:8000/objects?model=triposr

# Get specific object with URL refresh
curl http://asset-manager-service:8000/objects/{job_id}?refresh_url=true

# Get job status
curl http://asset-manager-service:8000/jobs/{job_id}

# List all jobs
curl http://asset-manager-service:8000/jobs?page=1&page_size=50

# Get statistics
curl http://asset-manager-service:8000/jobs/stats/summary
curl http://asset-manager-service:8000/objects/stats/storage
```

## Features

- ✅ Pagination support (configurable page size)
- ✅ Filtering by model type and status
- ✅ Presigned URL refresh for expired links
- ✅ Aggregate statistics
- ✅ Auto-generated OpenAPI docs
- ✅ Health checks with liveness/readiness probes
- ✅ Horizontal pod autoscaling support
